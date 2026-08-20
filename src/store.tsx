import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CoupleData } from "./types";
import { DEFAULT_DATA } from "./defaults";
import { fetchRemote, pushRemote, type RemoteStatus } from "./utils/remote";
import { resolveMedia } from "./utils/mediaStore";

/**
 * Central state store.
 *
 * Persistence & distribution, in order of reach:
 *  1. localStorage — survives reloads on this device.
 *  2. BroadcastChannel — every open tab on this device updates live.
 *  3. Remote endpoint (optional) — every device that knows the URL pushes
 *     its changes there and polls it every 15 seconds, so the whole app
 *     stays in step across devices with no manual steps.
 *     Revisions carry an `updatedAt` stamp; newest always wins.
 *
 * On first load the store does one immediate endpoint fetch so a brand-new
 * device shows the REAL shared content within ~2 seconds instead of the
 * sample defaults (the app shows a splash until that settles).
 */

const LS_KEY = "ours-couple-data-v1";
const CHANNEL = "ours-couple-sync";
const POLL_MS = 15_000;
const PUSH_DEBOUNCE_MS = 700;
const BOOT_TIMEOUT_MS = 4_000;

interface StoreValue {
  data: CoupleData;
  /** Shallow-merge a partial update, stamps it and distributes it. */
  patch: (p: Partial<CoupleData>) => void;
  /** Replace the whole data set (sync links / backups / endpoint). */
  replace: (next: CoupleData) => void;
  /** Wipe everything back to the factory content. */
  reset: () => void;
  /** Live status of the remote endpoint (if one is configured). */
  remote: RemoteStatus;
  /** Immediately push the current data to the endpoint. */
  pushNow: () => void;
  /**
   * False until the initial endpoint fetch settles (or times out).
   * The app shows a loading splash while this is false, so new devices
   * see the real shared content — not the sample defaults.
   */
  booted: boolean;
}

const StoreCtx = createContext<StoreValue | null>(null);

function loadInitial(): CoupleData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CoupleData>;
      // Merge over defaults so newly added fields never come out undefined.
      return { ...DEFAULT_DATA, ...parsed, version: 1 };
    }
  } catch {
    /* corrupted storage → fall back to defaults */
  }
  return DEFAULT_DATA;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CoupleData>(loadInitial);
  const [remote, setRemote] = useState<RemoteStatus>({
    state: "off",
    message: null,
    lastSync: null,
  });
  const [booted, setBooted] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const bcRef = useRef<BroadcastChannel | null>(null);
  const firstRender = useRef(true);
  const mounted = useRef(false);
  /** Set when an incoming revision was just applied — skip re-pushing it. */
  const skipPush = useRef(false);
  const pushTimer = useRef<number | null>(null);

  // ③c Instant first fetch: a fresh device pulls the shared content
  //     immediately so it looks "real" from the very first second.
  useEffect(() => {
    const ep = dataRef.current.remoteEndpoint;
    if (!ep) {
      setBooted(true);
      return;
    }
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        setBooted(true);
      }
    };
    const timer = window.setTimeout(finish, BOOT_TIMEOUT_MS);
    void (async () => {
      try {
        const payload = await fetchRemote(ep);
        if (payload && payload.at && payload.at > dataRef.current.updatedAt) {
          skipPush.current = true;
          setData({ ...DEFAULT_DATA, ...payload.data, updatedAt: payload.at });
        }
      } catch {
        /* offline — show local data; the poller keeps retrying */
      } finally {
        window.clearTimeout(timer);
        finish();
      }
    })();
    return () => window.clearTimeout(timer);
  }, []);

  // ② Live channel for same-device tabs.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e: MessageEvent) => {
      const incoming = e.data as { kind?: string; data?: CoupleData } | null;
      if (incoming?.kind !== "data" || !incoming.data) return;
      // Ignore our own echoes and older revisions.
      if ((incoming.data.updatedAt ?? "") <= dataRef.current.updatedAt) return;
      skipPush.current = true; // same-device change — don't re-push to cloud
      setData({ ...DEFAULT_DATA, ...incoming.data });
    };
    bcRef.current = bc;
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, []);

  // ① Persist locally + broadcast to sibling tabs on every change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {
      /* storage full — photos are compressed to stay under quota */
    }
    if (bcRef.current) {
      try {
        bcRef.current.postMessage({ kind: "data", data });
      } catch {
        /* channel closed */
      }
    }
  }, [data]);

  // ③a Poll the endpoint; silently apply anything newer.
  useEffect(() => {
    const ep = data.remoteEndpoint;
    if (!ep) {
      setRemote({ state: "off", message: null, lastSync: null });
      return;
    }
    let stopped = false;
    const check = async () => {
      try {
        const payload = await fetchRemote(ep);
        if (stopped) return;
        setRemote({ state: "live", message: null, lastSync: new Date().toISOString() });
        if (payload && payload.at && payload.at > dataRef.current.updatedAt) {
          skipPush.current = true;
          setData({ ...DEFAULT_DATA, ...payload.data, updatedAt: payload.at });
        }
      } catch (err) {
        if (stopped) return;
        setRemote({
          state: "error",
          message: err instanceof Error ? err.message : "Endpoint unreachable — retrying.",
          lastSync: null,
        });
      }
    };
    void check();
    const id = window.setInterval(() => void check(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [data.remoteEndpoint]);

  /**
   * A push swaps every inline photo / recording for a short media
   * reference. Adopting that leaner copy locally keeps this device's
   * localStorage small too — without it we'd re-upload the same base64
   * on every change and still risk blowing the storage quota.
   * The swap carries the same `updatedAt`, so it isn't a new revision
   * and must not trigger another push.
   */
  const applyLean = useCallback((lean: CoupleData) => {
    setData((cur) => {
      if (cur.updatedAt !== lean.updatedAt) return cur; // superseded already
      if (JSON.stringify(cur) === JSON.stringify(lean)) return cur; // nothing offloaded
      skipPush.current = true;
      return lean;
    });
  }, []);

  // ③b Debounced auto-push: any local change lands on the endpoint.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (skipPush.current) {
      skipPush.current = false;
      return;
    }
    const ep = dataRef.current.remoteEndpoint;
    if (!ep) return;
    if (pushTimer.current !== null) window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => {
      void pushRemote(ep, dataRef.current)
        .then(applyLean)
        .catch((err) => {
          setRemote({
            state: "error",
            message:
              err instanceof Error ? err.message : "Couldn't push your change — will retry.",
            lastSync: null,
          });
        });
    }, PUSH_DEBOUNCE_MS);
    return () => {
      if (pushTimer.current !== null) window.clearTimeout(pushTimer.current);
    };
  }, [data, applyLean]);

  const stamp = (d: CoupleData): CoupleData => ({
    ...d,
    version: 1,
    updatedAt: new Date().toISOString(),
  });

  const patch = useCallback((p: Partial<CoupleData>) => {
    setData((d) => stamp({ ...d, ...p }));
  }, []);

  const replace = useCallback((next: CoupleData) => {
    // Re-stamp with "now" so this revision is the newest one everywhere.
    setData(() => stamp({ ...DEFAULT_DATA, ...next }));
  }, []);

  const reset = useCallback(() => {
    setData(stamp({ ...DEFAULT_DATA }));
  }, []);

  const pushNow = useCallback(() => {
    const ep = dataRef.current.remoteEndpoint;
    if (!ep) return;
    setRemote((r) => ({ ...r, state: "working", message: null }));
    void pushRemote(ep, dataRef.current)
      .then((lean) => {
        applyLean(lean);
        setRemote({ state: "live", message: null, lastSync: new Date().toISOString() });
      })
      .catch((err) =>
        setRemote({
          state: "error",
          message: err instanceof Error ? err.message : "Push failed.",
          lastSync: null,
        })
      );
  }, [applyLean]);

  return (
    <StoreCtx.Provider value={{ data, patch, replace, reset, remote, pushNow, booted }}>
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/**
 * Turns a stored media value into something an <img>/<audio> can use.
 *
 * Handles both formats transparently: a `media:<hash>` reference becomes
 * a URL on the media store, while an old inline data-URL is returned
 * as-is. Returns null when there's nothing to show.
 */
export function useMediaSrc(value: string | null | undefined): string | null {
  const { data } = useStore();
  return resolveMedia(value, data.remoteEndpoint);
}
