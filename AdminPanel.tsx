import { useRef, useState, type ReactNode } from "react";
import { useStore } from "../store";
import { DEFAULT_DATA } from "../defaults";
import type { Emotion, EmotionIconKey, Memory, TintKey } from "../types";
import { EMOTION_ICONS, TINTS } from "../theme";
import {
  buildSyncLink,
  decodeSync,
  downloadBackup,
  fileToResizedDataUrl,
  readTextFile,
  uid,
  type SyncPayload,
} from "../utils/media";
import { createRemoteEndpoint } from "../utils/remote";
import {
  IconBell,
  IconCalendar,
  IconCamera,
  IconCheck,
  IconCopy,
  IconDownload,
  IconHeart,
  IconImages,
  IconLink,
  IconLock,
  IconMic,
  IconPlus,
  IconRefresh,
  IconSend,
  IconTrash,
  IconUpload,
  type IconComponent,
} from "./icons";
import { ImportModal } from "./ImportModal";
import { NoteRow } from "./VoiceNotesView";
import { VoiceRecorder } from "./VoiceRecorder";
import { BottomSheet } from "./Sheet";

const inputCls =
  "w-full rounded-xl bg-rose-50/80 px-3.5 py-2.5 text-sm text-rose-950 outline-none ring-1 ring-rose-100 transition placeholder:text-rose-300 focus:ring-2 focus:ring-rose-300";

const ICON_KEYS = Object.keys(EMOTION_ICONS) as EmotionIconKey[];
const TINT_KEYS = Object.keys(TINTS) as TintKey[];

/* ---------------- shared bits ---------------- */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: IconComponent;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="animate-fade-up rounded-[1.75rem] bg-white p-5 shadow-lg shadow-rose-100/60 ring-1 ring-rose-100">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 text-rose-500 ring-1 ring-rose-100">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-romantic text-[19px] leading-tight text-rose-950">{title}</h3>
          {desc && <p className="text-[11px] text-rose-400">{desc}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-200 py-3 text-[13px] font-semibold text-rose-500 transition hover:bg-rose-50 active:scale-[0.99]"
    >
      <IconPlus className="h-4 w-4" />
      {children}
    </button>
  );
}

/** Image upload → compressed data-URL. Powers "add & edit every photo". */
function PhotoPicker({
  value,
  onChange,
  size = "md",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  size?: "sm" | "md";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const box = size === "sm" ? "h-14 w-16" : "h-20 w-28";

  async function pick(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      onChange(await fileToResizedDataUrl(f));
    } catch {
      /* unreadable file — stay put */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`${box} shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 ring-1 ring-rose-100`}>
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-rose-300">
            <IconCamera className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <button
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-100 transition active:scale-95 disabled:opacity-50"
        >
          {busy ? "Processing…" : value ? "Change photo" : "Add photo"}
        </button>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-[10.5px] font-semibold text-rose-300 transition hover:text-rose-500"
          >
            <IconTrash className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void pick(f);
        }}
      />
    </div>
  );
}

/* ---------------- PIN gate ---------------- */

function PinGate({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (value === pin) {
      onUnlock();
    } else {
      setError(true);
      setValue("");
      window.setTimeout(() => setError(false), 450);
    }
  };

  return (
    <div className="animate-fade-up mx-auto mt-6 max-w-[300px] rounded-[1.9rem] bg-white p-7 text-center shadow-lg shadow-rose-100 ring-1 ring-rose-100">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-400 text-white shadow-md shadow-rose-200">
        <IconLock className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-romantic text-xl text-rose-950">Admin access</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-rose-400">
        The private side of things. Enter your 4-digit PIN.
      </p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && value.length === 4 && submit()}
        placeholder="••••"
        className={`mt-5 w-full rounded-2xl bg-rose-50 px-4 py-3.5 text-center font-romantic text-2xl tracking-[0.5em] text-rose-950 outline-none ring-1 transition placeholder:tracking-normal placeholder:text-rose-200 ${
          error ? "animate-shake ring-rose-400" : "ring-rose-100 focus:ring-2 focus:ring-rose-300"
        }`}
      />
      {error && <p className="mt-2 text-[11px] font-medium text-rose-500">That's not it — try again.</p>}
      <button
        onClick={submit}
        disabled={value.length !== 4}
        className="mt-4 w-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition active:scale-[0.98] disabled:opacity-40"
      >
        Unlock
      </button>
      <p className="mt-3 text-[10.5px] text-rose-300">
        Default PIN: 1234 — change it in Security below.
      </p>
    </div>
  );
}

/* ---------------- sections ---------------- */

function RelationshipSection() {
  const { data, patch } = useStore();
  const supported = "Notification" in window;
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    supported ? Notification.permission : "unsupported"
  );

  return (
    <Section icon={IconCalendar} title="Relationship details" desc="names, dates and the shared hero photo">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Your name">
          <input value={data.myName} onChange={(e) => patch({ myName: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Their name">
          <input value={data.partnerName} onChange={(e) => patch({ partnerName: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Together since">
          <input type="date" value={data.startDate} onChange={(e) => patch({ startDate: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Anniversary">
          <input type="date" value={data.anniversaryDate} onChange={(e) => patch({ anniversaryDate: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <Field label="Hero photo (countdown card)">
        <PhotoPicker value={data.heroImage} onChange={(v) => patch({ heroImage: v })} />
      </Field>

      <div className="border-t border-rose-100 pt-4">
        <Field label="Daily note time">
          <input type="time" value={data.dailyTime} onChange={(e) => patch({ dailyTime: e.target.value })} className={inputCls + " tnum"} />
        </Field>
        <div className="mt-3">
          {supported ? (
            perm !== "granted" ? (
              <button
                onClick={() => { void Notification.requestPermission().then(setPerm); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 py-2.5 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-100 transition active:scale-[0.99]"
              >
                <IconBell className="h-4 w-4" />
                Allow browser notifications
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  <IconCheck className="h-4 w-4" />
                  Notifications on
                </span>
                <button
                  onClick={() => {
                    const m = data.dailyMessages.filter((x) => x.trim());
                    try {
                      new Notification(`A little note for ${data.partnerName}`, {
                        body: m.length ? m[0] : "You are loved.",
                      });
                    } catch { /* ignore */ }
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12px] font-semibold text-rose-600 ring-1 ring-rose-100 transition active:scale-[0.98]"
                >
                  <IconSend className="h-4 w-4" />
                  Test
                </button>
              </div>
            )
          ) : (
            <p className="text-[11px] leading-relaxed text-rose-300">
              This browser doesn't support system notifications — the note still appears in the app at the chosen time.
            </p>
          )}
          <p className="mt-2 text-[10.5px] leading-relaxed text-rose-300">
            Tip: keep the app open (or pin it to your home screen) so the daily note arrives at {data.dailyTime}.
          </p>
        </div>
      </div>
    </Section>
  );
}

function MessagesSection() {
  const { data, patch } = useStore();
  const set = (i: number, v: string) =>
    patch({ dailyMessages: data.dailyMessages.map((m, j) => (j === i ? v : m)) });
  const remove = (i: number) =>
    patch({ dailyMessages: data.dailyMessages.filter((_, j) => j !== i) });

  return (
    <Section icon={IconBell} title="Daily love notes" desc="rotates automatically — one per day, same on both devices">
      {data.dailyMessages.map((m, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className="mt-3 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-500">
            {i + 1}
          </span>
          <textarea
            value={m}
            onChange={(e) => set(i, e.target.value)}
            rows={2}
            className={inputCls + " flex-1 resize-y font-romantic text-[14px] leading-relaxed"}
          />
          <button
            onClick={() => remove(i)}
            aria-label="Delete message"
            className="mt-2.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-rose-300 ring-1 ring-rose-100 transition hover:text-rose-600 active:scale-90"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <AddButton onClick={() => patch({ dailyMessages: [...data.dailyMessages, "A new little note for another day…"] })}>
        Add a message
      </AddButton>
    </Section>
  );
}

function EmotionsSection() {
  const { data, patch } = useStore();
  const update = (id: string, p: Partial<Emotion>) =>
    patch({ emotions: data.emotions.map((e) => (e.id === id ? { ...e, ...p } : e)) });
  const remove = (id: string) => patch({ emotions: data.emotions.filter((e) => e.id !== id) });

  return (
    <Section icon={IconHeart} title="Open When notes" desc="the moods and the letter behind each one">
      {data.emotions.map((e) => (
        <div key={e.id} className="space-y-3 rounded-2xl bg-rose-50/60 p-4 ring-1 ring-rose-100">
          <div className="flex items-center gap-2">
            <input value={e.label} onChange={(ev) => update(e.id, { label: ev.target.value })} className={inputCls + " flex-1"} />
            <button
              onClick={() => remove(e.id)}
              aria-label="Delete feeling"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-rose-400 ring-1 ring-rose-100 transition hover:text-rose-600 active:scale-90"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-300">Icon</span>
            <div className="flex flex-wrap gap-1.5">
              {ICON_KEYS.map((k) => {
                const KIcon = EMOTION_ICONS[k];
                return (
                  <button
                    key={k}
                    onClick={() => update(e.id, { icon: k })}
                    aria-label={`Icon ${k}`}
                    className={`grid h-8 w-8 place-items-center rounded-lg ring-1 transition active:scale-90 ${
                      e.icon === k ? "bg-rose-500 text-white ring-rose-500" : "bg-white text-rose-400 ring-rose-100"
                    }`}
                  >
                    <KIcon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-300">Tint</span>
            <div className="flex flex-wrap gap-1.5">
              {TINT_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => update(e.id, { tint: k })}
                  aria-label={TINTS[k].label}
                  className={`h-7 w-7 rounded-full ${TINTS[k].dot} transition active:scale-90 ${
                    e.tint === k ? "ring-2 ring-rose-950/50 ring-offset-2" : "opacity-70"
                  }`}
                />
              ))}
            </div>
          </div>
          <textarea
            value={e.note}
            onChange={(ev) => update(e.id, { note: ev.target.value })}
            rows={4}
            className={inputCls + " resize-y leading-relaxed"}
          />
        </div>
      ))}
      <AddButton
        onClick={() =>
          patch({
            emotions: [
              ...data.emotions,
              {
                id: uid(),
                label: "New feeling",
                icon: "sparkle",
                tint: "rose",
                note: "Write the note you'd want to read when you're feeling this…",
              },
            ],
          })
        }
      >
        Add a feeling
      </AddButton>
    </Section>
  );
}

function MemoriesSection() {
  const { data, patch } = useStore();
  const update = (id: string, p: Partial<Memory>) =>
    patch({ memories: data.memories.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  const remove = (id: string) => patch({ memories: data.memories.filter((m) => m.id !== id) });

  return (
    <Section icon={IconImages} title="Memories & letters" desc="photos, places and the words that go with them">
      {data.memories.map((m) => (
        <div key={m.id} className="space-y-3 rounded-2xl bg-rose-50/60 p-4 ring-1 ring-rose-100">
          <div className="flex items-center justify-between gap-3">
            <PhotoPicker size="sm" value={m.image} onChange={(v) => update(m.id, { image: v })} />
            <button
              onClick={() => remove(m.id)}
              aria-label="Delete memory"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white text-rose-400 ring-1 ring-rose-100 transition hover:text-rose-600 active:scale-90"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
          <Field label="Title">
            <input value={m.title} onChange={(e) => update(m.id, { title: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <input value={m.location} onChange={(e) => update(m.id, { location: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Date badge">
              <input value={m.dateLabel} onChange={(e) => update(m.id, { dateLabel: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="The letter">
            <textarea value={m.letter} onChange={(e) => update(m.id, { letter: e.target.value })} rows={4} className={inputCls + " resize-y leading-relaxed"} />
          </Field>
        </div>
      ))}
      <AddButton
        onClick={() =>
          patch({
            memories: [
              ...data.memories,
              {
                id: uid(),
                title: "A new memory",
                location: "Somewhere that matters",
                dateLabel: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
                image: null,
                motif: "camera",
                letter: "Write the story behind this moment…",
              },
            ],
          })
        }
      >
        Add a memory
      </AddButton>
    </Section>
  );
}

function VoiceSection() {
  const { data, patch } = useStore();
  const [recording, setRecording] = useState(false);

  return (
    <Section icon={IconMic} title="Voice notes" desc="record something in your own voice">
      <button
        onClick={() => setRecording(true)}
        className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 py-3 text-[13px] font-semibold text-white shadow-md shadow-rose-200 transition active:scale-[0.99]"
      >
        Record a new voice note
      </button>
      {data.voiceNotes.length === 0 ? (
        <p className="text-center text-[12px] text-rose-300">No voice notes yet.</p>
      ) : (
        <div className="space-y-3">
          {data.voiceNotes.map((n) => (
            <NoteRow
              key={n.id}
              note={n}
              onDelete={() => patch({ voiceNotes: data.voiceNotes.filter((x) => x.id !== n.id) })}
            />
          ))}
        </div>
      )}
      {recording && (
        <BottomSheet onClose={() => setRecording(false)}>
          <VoiceRecorder
            onDone={() => setRecording(false)}
            onSave={(audio, title) =>
              patch({
                voiceNotes: [
                  { id: uid(), title, audio, createdAt: new Date().toISOString() },
                  ...data.voiceNotes,
                ],
              })
            }
          />
        </BottomSheet>
      )}
    </Section>
  );
}

function SecuritySection() {
  const { data, patch } = useStore();
  const [pin, setPin] = useState("");
  const [saved, setSaved] = useState(false);
  const valid = /^\d{4}$/.test(pin);

  return (
    <Section icon={IconLock} title="Security" desc="the PIN that guards this panel">
      <Field label="Admin PIN (4 digits)">
        <input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
            setSaved(false);
          }}
          inputMode="numeric"
          placeholder={data.adminPin === "1234" ? "1234" : "••••"}
          className={inputCls + " tnum tracking-[0.4em]"}
        />
      </Field>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (valid) {
              patch({ adminPin: pin });
              setSaved(true);
              setPin("");
            }
          }}
          disabled={!valid}
          className="flex-1 rounded-xl bg-rose-500/10 py-2.5 text-[13px] font-semibold text-rose-600 ring-1 ring-rose-200 transition active:scale-[0.99] disabled:opacity-40"
        >
          Save PIN
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <IconCheck className="h-3.5 w-3.5" />
            Updated
          </span>
        )}
      </div>
    </Section>
  );
}

function SyncSection() {
  const { data, patch, replace, reset, remote, pushNow } = useStore();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [req, setReq] = useState<SyncPayload | null>(null);
  const [resetAsk, setResetAsk] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [copiedEp, setCopiedEp] = useState(false);
  const [epPaste, setEpPaste] = useState("");
  const [epReq, setEpReq] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const connectEp = (raw: string) => {
    const url = raw.trim();
    if (!/^https?:\/\/\S+/i.test(url) || url.includes("#sync=")) {
      setCreateErr("That doesn't look like an endpoint URL (it should start with https://).");
      return;
    }
    setCreateErr(null);
    setEpPaste("");
    patch({ remoteEndpoint: url });
  };

  const createEp = async () => {
    setCreating(true);
    setCreateErr(null);
    try {
      const url = await createRemoteEndpoint(data);
      patch({ remoteEndpoint: url });
    } catch (e) {
      setCreateErr(
        e instanceof Error ? e.message : "Couldn't create the endpoint. Check your connection and try again."
      );
    } finally {
      setCreating(false);
    }
  };

  const copyEndpoint = async () => {
    const ep = data.remoteEndpoint;
    if (!ep) return;
    try {
      await navigator.clipboard.writeText(ep);
      setCopiedEp(true);
      window.setTimeout(() => setCopiedEp(false), 2000);
    } catch {
      /* clipboard blocked — the field is selectable */
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the textarea is selectable */
    }
  };

  const receive = () => {
    const trimmed = paste.trim();
    // A bare endpoint URL (no #sync=) → connect to it instead of decoding.
    if (/^https?:\/\//i.test(trimmed) && !trimmed.includes("#sync=")) {
      setErr(null);
      setEpReq(trimmed);
      return;
    }
    const p = decodeSync(trimmed);
    if (!p) {
      setErr("Couldn't read that. Paste a sync link, an endpoint URL, or the contents of a backup file.");
      return;
    }
    setErr(null);
    setPaste("");
    setReq(p);
  };

  const onBackup = async (f: File | undefined) => {
    if (!f) return;
    const p = decodeSync(await readTextFile(f));
    if (!p) setErr("That file doesn't look like an Ours backup.");
    else {
      setErr(null);
      setReq(p);
    }
  };

  return (
    <Section icon={IconLink} title="Sync & data" desc="make every change reach every device">
      {/* ── Live sync endpoint ─────────────────────────────── */}
      <div className="rounded-2xl bg-rose-50/70 p-4 ring-1 ring-rose-100">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-500">
          Live sync endpoint
        </p>
        {!data.remoteEndpoint ? (
          <>
            <p className="mt-2 text-[12px] leading-relaxed text-rose-500">
              One click creates a free shared URL. Every device following it updates
              automatically — your changes are pushed there, and the other person's changes
              land within about 15 seconds. No more sharing links.
            </p>
            <button
              onClick={() => void createEp()}
              disabled={creating}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 py-3 text-[13px] font-semibold text-white shadow-md shadow-rose-200 transition active:scale-[0.99] disabled:opacity-60"
            >
              <IconLink className="h-4 w-4" />
              {creating ? "Creating your endpoint…" : "Create our shared endpoint"}
            </button>
            <div className="mt-3 border-t border-rose-100 pt-3">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-rose-300">
                Or paste an endpoint URL you were given
              </p>
              <div className="flex gap-2">
                <input
                  value={epPaste}
                  onChange={(e) => setEpPaste(e.target.value)}
                  placeholder="https://jsonblob.com/api/jsonBlob/…"
                  className={inputCls + " flex-1 font-mono text-[11px]"}
                />
                <button
                  onClick={() => connectEp(epPaste)}
                  disabled={!epPaste.trim()}
                  className="shrink-0 rounded-xl bg-rose-500/10 px-3.5 text-[12px] font-semibold text-rose-600 ring-1 ring-rose-200 transition active:scale-95 disabled:opacity-40"
                >
                  Connect
                </button>
              </div>
            </div>
            {createErr && <p className="mt-2 text-[11.5px] font-medium text-rose-500">{createErr}</p>}
          </>
        ) : (
          <>
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className={`flex flex-1 items-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-semibold ring-1 ${
                  remote.state === "live"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : remote.state === "error"
                      ? "bg-amber-50 text-amber-700 ring-amber-100"
                      : "bg-sky-50 text-sky-700 ring-sky-100"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    remote.state === "live"
                      ? "bg-emerald-500"
                      : remote.state === "error"
                        ? "bg-amber-500"
                        : "animate-pulse bg-sky-500"
                  }`}
                />
                {remote.state === "live"
                  ? "Auto-sync on" +
                    (remote.lastSync
                      ? ` · updated ${new Date(remote.lastSync).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                      : "")
                  : remote.state === "error"
                    ? remote.message ?? "Endpoint unreachable"
                    : "Working…"}
              </span>
              <button
                onClick={pushNow}
                className="rounded-xl bg-white px-3 py-2 text-[11.5px] font-semibold text-rose-600 ring-1 ring-rose-100 transition active:scale-95"
              >
                Push now
              </button>
              <a
                href={data.remoteEndpoint ?? "#"}
                target="_blank"
                rel="noreferrer"
                title="Open the raw endpoint to see what the device is actually receiving"
                className="rounded-xl bg-white px-3 py-2 text-[11.5px] font-semibold text-rose-600 ring-1 ring-rose-100 transition active:scale-95"
              >
                Open
              </a>
            </div>
            <textarea
              readOnly
              value={data.remoteEndpoint}
              rows={2}
              onFocus={(e) => e.currentTarget.select()}
              className={inputCls + " mt-2.5 resize-none font-mono text-[11px] text-rose-500"}
            />
            <div className="mt-2 flex gap-2.5">
              <button
                onClick={() => void copyEndpoint()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-[12px] font-semibold text-rose-600 ring-1 ring-rose-100 transition active:scale-[0.98]"
              >
                {copiedEp ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
                {copiedEp ? "Copied!" : "Copy endpoint"}
              </button>
              <button
                onClick={() => patch({ remoteEndpoint: null })}
                className="flex-1 rounded-xl bg-white py-2.5 text-[12px] font-semibold text-rose-400 ring-1 ring-rose-100 transition hover:text-rose-600 active:scale-[0.98]"
              >
                Disconnect
              </button>
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-rose-300">
              Send this URL to your partner once (or just send them the next sync link — the
              endpoint travels with it). After that, both devices stay in step automatically,
              forever.
            </p>
          </>
        )}
      </div>

      <ol className="space-y-1.5 rounded-2xl bg-amber-50/80 p-4 text-[12px] leading-relaxed text-amber-800 ring-1 ring-amber-100">
        <li>
          <b>No endpoint yet?</b> Share a sync link below as before — or create the endpoint
          above and never think about syncing again.
        </li>
        <li>
          <b>Same device:</b> every open tab updates live as you type. Newest version always
          wins.
        </li>
      </ol>

      <button
        onClick={() => {
          setLink(buildSyncLink(data));
          setCopied(false);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 py-3 text-[13px] font-semibold text-white shadow-md shadow-rose-200 transition active:scale-[0.99]"
      >
        <IconLink className="h-4 w-4" />
        Create sync link
      </button>
      {link && (
        <div className="space-y-2">
          <textarea
            readOnly
            value={link}
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
            className={inputCls + " resize-none font-mono text-[11px] text-rose-500"}
          />
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => void copy()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2.5 text-[12px] font-semibold text-rose-600 ring-1 ring-rose-100 transition active:scale-[0.98]"
            >
              {copied ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            {link.length > 60000 && (
              <p className="text-right text-[10.5px] leading-snug text-amber-600">
                Link is large — a backup file may be more reliable.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-rose-100 pt-4">
        <Field label="Receive an update">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={2}
            placeholder="Paste a sync link, an endpoint URL, or backup file contents here…"
            className={inputCls + " resize-none text-[12px]"}
          />
        </Field>
        {err && <p className="text-[11.5px] font-medium text-rose-500">{err}</p>}
        <button
          onClick={receive}
          disabled={!paste.trim()}
          className="w-full rounded-2xl bg-rose-500/10 py-3 text-[13px] font-semibold text-rose-600 ring-1 ring-rose-200 transition active:scale-[0.99] disabled:opacity-40"
        >
          Apply received update
        </button>
      </div>

      <div className="flex gap-2.5 border-t border-rose-100 pt-4">
        <button
          onClick={() => downloadBackup(data)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2.5 text-[12px] font-semibold text-rose-600 ring-1 ring-rose-100 transition active:scale-[0.98]"
        >
          <IconDownload className="h-4 w-4" />
          Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2.5 text-[12px] font-semibold text-rose-600 ring-1 ring-rose-100 transition active:scale-[0.98]"
        >
          <IconUpload className="h-4 w-4" />
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onBackup(f);
          }}
        />
      </div>

      <div className="border-t border-rose-100 pt-4">
        <p className="mb-2 text-[11px] text-rose-300">
          Last updated:{" "}
          {new Date(data.updatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <button
          onClick={() => setResetAsk(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-[12px] font-semibold text-rose-400 ring-1 ring-rose-100 transition hover:text-rose-600 active:scale-[0.98]"
        >
          <IconRefresh className="h-4 w-4" />
          Reset everything to defaults
        </button>
      </div>

      {req && (
        <ImportModal
          title="Apply this update?"
          message={
            req.at < data.updatedAt
              ? "Warning: this update is OLDER than what you already have. Applying it rolls back your newer changes — since your endpoint is set up, you almost certainly want to Cancel."
              : "This replaces the current content with the shared version. Everything is newest-wins, so only apply it if it's newer than what you have."
          }
          onConfirm={() => {
            replace({ ...DEFAULT_DATA, ...req.data });
            setReq(null);
            setPaste("");
          }}
          onCancel={() => setReq(null)}
        />
      )}
      {epReq && (
        <ImportModal
          title="Connect to this endpoint?"
          message="This URL will become your live sync endpoint — this device follows it automatically and pushes its own changes to it. Make sure it's the one your partner created."
          confirmLabel="Connect"
          onConfirm={() => {
            connectEp(epReq);
            setEpReq(null);
            setPaste("");
          }}
          onCancel={() => setEpReq(null)}
        />
      )}
      {resetAsk && (
        <ImportModal
          title="Reset everything?"
          message="All photos, notes, voice notes and dates go back to the original sample content. This can't be undone — export a backup first if in doubt."
          confirmLabel="Reset"
          onConfirm={() => {
            reset();
            setResetAsk(false);
          }}
          onCancel={() => setResetAsk(false)}
        />
      )}
    </Section>
  );
}

/* ---------------- root ---------------- */

export function AdminPanel() {
  const { data } = useStore();
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("ours-admin-unlocked") === "1"
  );

  if (!unlocked) {
    return (
      <PinGate
        pin={data.adminPin}
        onUnlock={() => {
          sessionStorage.setItem("ours-admin-unlocked", "1");
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <RelationshipSection />
      <MessagesSection />
      <EmotionsSection />
      <MemoriesSection />
      <VoiceSection />
      <SecuritySection />
      <SyncSection />
      <button
        onClick={() => {
          sessionStorage.removeItem("ours-admin-unlocked");
          setUnlocked(false);
        }}
        className="mx-auto block pb-2 pt-1 text-[11px] font-semibold text-rose-300 transition hover:text-rose-500"
      >
        Lock admin
      </button>
    </div>
  );
}
