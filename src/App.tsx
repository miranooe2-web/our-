import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "./store";
import { DEFAULT_DATA } from "./defaults";
import { dayOfYear, msUntilDailyTime } from "./utils/date";
import { decodeSync, type SyncPayload } from "./utils/media";
import { CountdownCard } from "./components/CountdownCard";
import { DailyLoveNote } from "./components/DailyLoveNote";
import { EmotionsView } from "./components/EmotionsView";
import { MemoriesView } from "./components/MemoriesView";
import { VoiceNotesView } from "./components/VoiceNotesView";
import { AdminPanel } from "./components/AdminPanel";
import { ImportModal } from "./components/ImportModal";
import {
  IconGear,
  IconHeart,
  IconHome,
  IconImages,
  IconMic,
  type IconComponent,
} from "./components/icons";

type Tab = "home" | "memories" | "voice" | "admin";

const TABS: { key: Tab; label: string; icon: IconComponent }[] = [
  { key: "home", label: "Home", icon: IconHome },
  { key: "memories", label: "Memories", icon: IconImages },
  { key: "voice", label: "Voice", icon: IconMic },
  { key: "admin", label: "Admin", icon: IconGear },
];

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-5 px-1">
      <h1 className="font-romantic text-[28px] leading-tight text-rose-950">{title}</h1>
      <p className="mt-0.5 text-[12px] text-rose-400">{subtitle}</p>
    </header>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh w-full place-items-center bg-[#fdf4ef]">
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-400 text-white shadow-lg shadow-rose-200">
          <IconHeart filled className="h-6 w-6 animate-heartbeat" />
        </span>
        <p className="font-romantic text-sm text-rose-400">Loading our little corner…</p>
      </div>
    </div>
  );
}

function Shell() {
  const { data, replace, remote } = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [banner, setBanner] = useState<string | null>(null);
  const [importReq, setImportReq] = useState<SyncPayload | null>(null);

  // Opened a partner's sync link on this device → ask to apply it.
  useEffect(() => {
    const h = window.location.hash;
    if (h.startsWith("#sync=")) {
      const p = decodeSync(h);
      if (p) setImportReq(p);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // The web version of the "daily notification at 9:00 AM" trigger.
  // Fires a system Notification (if permitted) plus an in-app banner.
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const ms = msUntilDailyTime(data.dailyTime);
    const id = window.setTimeout(() => {
      const msgs = data.dailyMessages.map((m) => m.trim()).filter(Boolean);
      const body = msgs.length
        ? msgs[dayOfYear(new Date()) % msgs.length]
        : "You are loved. That's the note for today.";
      setBanner(body);
      try {
        new Notification(`A little note for ${data.partnerName}`, { body });
      } catch {
        /* notification blocked mid-session */
      }
      window.setTimeout(() => setBanner(null), 10_000);
    }, ms);
    return () => window.clearTimeout(id);
  }, [data.dailyTime, data.dailyMessages, data.partnerName]);

  const applyImport = () => {
    if (!importReq) return;
    replace({ ...DEFAULT_DATA, ...importReq.data });
    setImportReq(null);
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-[#fdf4ef] via-[#fff8f3] to-[#fdeee6]">
      {/* Daily-note banner */}
      {banner && (
        <div className="animate-fade-down absolute inset-x-3 top-3 z-40">
          <div className="flex items-start gap-3 rounded-2xl bg-white/95 p-4 shadow-xl shadow-rose-200/70 ring-1 ring-rose-100 backdrop-blur">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-amber-400 text-white">
              <IconHeart filled className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-400">
                Your daily note
              </p>
              <p className="mt-0.5 font-romantic text-[14px] leading-snug text-rose-950">
                {banner}
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-28 pt-6">
        {tab === "home" && (
          <div className="space-y-6">
            <header className="flex items-end justify-between px-1">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-400">
                  {today}
                  {data.remoteEndpoint && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal ring-1 ${
                        remote.state === "live"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                      }`}
                    >
                      <span
                        className={`h-1 w-1 rounded-full ${
                          remote.state === "live" ? "bg-emerald-500" : "animate-pulse bg-amber-500"
                        }`}
                      />
                      {remote.state === "live" ? "Synced" : "Syncing…"}
                    </span>
                  )}
                </p>
                <h1 className="font-romantic text-[28px] leading-tight text-rose-950">
                  Our little corner
                </h1>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-400 text-white shadow-lg shadow-rose-200">
                <IconHeart filled className="h-5 w-5 animate-heartbeat" />
              </span>
            </header>
            <CountdownCard />
            <DailyLoveNote />
            <EmotionsView />
          </div>
        )}
        {tab === "memories" && (
          <div>
            <PageHeader title="Memories" subtitle="the moments we'd re-live, one letter at a time" />
            <MemoriesView />
          </div>
        )}
        {tab === "voice" && (
          <div>
            <PageHeader title="Voice" subtitle="our words, in our own voices" />
            <VoiceNotesView />
          </div>
        )}
        {tab === "admin" && (
          <div>
            <PageHeader
              title="Admin"
              subtitle="make it yours — every change syncs to all your devices"
            />
            <AdminPanel />
          </div>
        )}
      </main>

      {/* Bottom tab bar */}
      <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#fdeee6] via-[#fdeee6]/85 to-transparent px-4 pb-4 pt-8">
        <div className="pointer-events-auto mx-auto flex max-w-[390px] items-center justify-between rounded-[1.9rem] bg-white/95 px-2 py-2 shadow-xl shadow-rose-200/60 ring-1 ring-rose-100 backdrop-blur">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-4 py-2 transition-all duration-300 ${
                  active ? "bg-rose-100 text-rose-600" : "text-rose-300 hover:text-rose-400"
                }`}
              >
                <t.icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Partner shared a sync link → apply? */}
      {importReq && (
        <ImportModal
          title="Your partner shared an update"
          message={
            importReq.at < data.updatedAt
              ? "Warning: this link is OLDER than the data already on this device. Applying it would roll back your newer changes. Since your endpoint is set up, you almost certainly want to Cancel."
              : "This link contains their latest version of your shared content — dates, notes, photos and voice notes. Apply it?"
          }
          onConfirm={applyImport}
          onCancel={() => setImportReq(null)}
        />
      )}
    </div>
  );
}

function Frame() {
  const { booted } = useStore();
  if (!booted) return <Splash />;
  return (
    <div
      className="grid min-h-dvh w-full place-items-center md:py-8"
      style={{
        background:
          "radial-gradient(1100px 700px at 15% -5%, #fbe3d8 0%, #f6e2d8 45%, #f1d9d2 100%)",
      }}
    >
      <div className="relative h-dvh w-full max-w-[430px] overflow-hidden md:h-[min(880px,94dvh)] md:rounded-[2.6rem] md:shadow-2xl md:shadow-rose-400/30 md:ring-1 md:ring-rose-900/10">
        <Shell />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Frame />
    </StoreProvider>
  );
}
