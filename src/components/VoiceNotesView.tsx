import { useEffect, useRef, useState } from "react";
import { useMediaSrc, useStore } from "../store";
import type { VoiceNote } from "../types";
import { uid } from "../utils/media";
import { IconMic, IconPause, IconPlay, IconTrash } from "./icons";
import { BottomSheet } from "./Sheet";
import { VoiceRecorder } from "./VoiceRecorder";

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Raw bytes of a clip, for the WebAudio fallback.
 *
 * A recording is either a `media:<hash>` reference already resolved to a
 * URL (fetch it) or a legacy inline data-URL (decode the base64 here).
 */
async function clipToArrayBuffer(src: string): Promise<ArrayBuffer> {
  if (!src.startsWith("data:")) {
    const res = await fetch(src);
    if (!res.ok) throw new Error("Couldn't load that recording.");
    return res.arrayBuffer();
  }
  const b64 = src.slice(src.indexOf(",") + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

interface WAPlayer {
  ctx: AudioContext;
  buffer: AudioBuffer;
  src: AudioBufferSourceNode | null;
  /** seconds into the buffer at the moment playback (re)started */
  offset: number;
  /** ctx.currentTime at the moment playback (re)started */
  startedAt: number;
  raf: number;
}

/**
 * A single playable voice-note row (reused in the Admin tab).
 *
 * Playback strategy: try a normal <audio> element first; if it can't
 * handle the clip (classic iOS Safari issue where recorded data-URL MP4s
 * report Infinity duration and refuse to play), fall back to WebAudio —
 * the whole clip is decoded with decodeAudioData and played
 * sample-accurately, which works on every browser.
 */
export function NoteRow({
  note,
  onDelete,
}: {
  note: VoiceNote;
  onDelete?: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waRef = useRef<WAPlayer | null>(null);
  const manualStop = useRef(false);
  // "media:<hash>" → a URL the browser can stream and cache; a legacy
  // inline data-URL is passed through untouched.
  const audioSrc = useMediaSrc(note.audio);

  useEffect(() => {
    setPlaying(false);
    setT(0);
    setDur(0);
    if (!audioSrc) return;
    const a = new Audio(audioSrc);
    audioRef.current = a;
    a.preload = "metadata";
    const syncTime = () => {
      setT(a.currentTime);
      if (isFinite(a.duration) && a.duration > 0) setDur(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setT(0);
      a.currentTime = 0;
    };
    const onError = () => {
      setPlaying(false);
    };
    a.addEventListener("timeupdate", syncTime);
    a.addEventListener("loadedmetadata", syncTime);
    a.addEventListener("durationchange", syncTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onError);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", syncTime);
      a.removeEventListener("loadedmetadata", syncTime);
      a.removeEventListener("durationchange", syncTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onError);
      a.src = "";
      audioRef.current = null;
      const w = waRef.current;
      if (w) {
        cancelAnimationFrame(w.raf);
        manualStop.current = true;
        if (w.src) {
          w.src.onended = null;
          try {
            w.src.stop();
          } catch {
            /* already stopped */
          }
        }
        w.ctx.close().catch(() => {});
        waRef.current = null;
      }
    };
  }, [audioSrc]);

  const tick = () => {
    const w = waRef.current;
    if (!w || !w.src) return;
    const pos = w.offset + (w.ctx.currentTime - w.startedAt);
    if (pos >= w.buffer.duration) {
      setT(w.buffer.duration);
      setPlaying(false);
      w.offset = 0;
      w.src = null;
      return;
    }
    setT(pos);
    w.raf = requestAnimationFrame(tick);
  };

  const startWebAudio = () => {
    const w = waRef.current;
    if (!w || w.src) return;
    const src = w.ctx.createBufferSource();
    src.buffer = w.buffer;
    src.connect(w.ctx.destination);
    manualStop.current = false;
    src.onended = () => {
      if (manualStop.current) return;
      const cur = waRef.current;
      if (cur) {
        cur.src = null;
        cur.offset = 0;
      }
      setPlaying(false);
      setT(0);
    };
    src.start(0, w.offset);
    w.src = src;
    w.startedAt = w.ctx.currentTime;
    w.raf = requestAnimationFrame(tick);
  };

  const stopWebAudio = (reset: boolean) => {
    const w = waRef.current;
    if (w && w.src) {
      cancelAnimationFrame(w.raf);
      if (!reset) {
        w.offset = Math.min(w.buffer.duration, w.offset + (w.ctx.currentTime - w.startedAt));
        setT(w.offset);
      }
      manualStop.current = true;
      w.src.onended = null;
      try {
        w.src.stop();
      } catch {
        /* already stopped */
      }
      w.src = null;
      if (reset) {
        w.offset = 0;
        setT(0);
      }
    }
  };

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause();
      stopWebAudio(false);
      setPlaying(false);
      return;
    }
    // 1) Prefer the browser's native audio element. Do NOT wait for
    // metadata or a finite duration before calling play(): recorded clips
    // (especially mobile MP4/data URLs) can report NaN/Infinity until after
    // playback starts. Gating on duration made perfectly valid notes appear
    // dead when tapped.
    const a = audioRef.current;
    if (a) {
      try {
        await a.play();
        if (isFinite(a.duration) && a.duration > 0) setDur(a.duration);
        setPlaying(true);
        return;
      } catch {
        a.pause();
        /* native playback failed → WebAudio fallback below */
      }
    }
    // 2) WebAudio fallback: decode the whole clip, play sample-accurately
    if (!audioSrc) return;
    try {
      if (!waRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        const buf = await ctx.decodeAudioData(await clipToArrayBuffer(audioSrc));
        if (audioRef.current === null) return; // unmounted while decoding
        setDur(buf.duration);
        waRef.current = { ctx, buffer: buf, src: null, offset: 0, startedAt: 0, raf: 0 };
      }
      const w = waRef.current;
      if (w.ctx.state === "suspended") await w.ctx.resume();
      startWebAudio();
      setPlaying(true);
    } catch {
      /* decode failed — nothing playable here */
    }
  };

  const progress = dur > 0 ? Math.min(1, t / dur) : 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm shadow-rose-100/70 ring-1 ring-rose-100">
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-rose-400 text-white shadow-md shadow-rose-200 transition active:scale-90"
      >
        {playing ? <IconPause className="h-5 w-5" /> : <IconPlay className="ml-0.5 h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-rose-950">{note.title}</p>
          <p className="tnum shrink-0 text-[11px] font-medium text-rose-400">
            {fmtTime(t)} / {fmtTime(dur)}
          </p>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-rose-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete voice note"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-rose-300 transition hover:bg-rose-50 hover:text-rose-500 active:scale-90"
        >
          <IconTrash className="h-4.5 w-4.5" />
        </button>
      )}
    </div>
  );
}

/**
 * VoiceNotesView — the shared voice-note tab: play the couple's notes
 * or record a new one (saved straight into the synced data set).
 */
export function VoiceNotesView() {
  const { data, patch } = useStore();
  const [recording, setRecording] = useState(false);

  return (
    <div className="animate-fade-up">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="font-romantic text-[22px] text-rose-950">Voice notes</h2>
        <span className="text-[11px] font-medium text-rose-400">
          {data.voiceNotes.length} saved
        </span>
      </div>

      <button
        onClick={() => setRecording(true)}
        className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition active:scale-[0.98]"
      >
        <IconMic className="h-5 w-5" />
        Record a voice note
      </button>

      {data.voiceNotes.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-rose-200/80 bg-rose-50/50 px-6 py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-100 text-rose-400">
            <IconMic className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-semibold text-rose-950">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-[240px] text-[12.5px] leading-relaxed text-rose-400">
            Record the first one — a good morning, a lullaby, or your side of the story.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.voiceNotes.map((n) => (
            <NoteRow key={n.id} note={n} />
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
    </div>
  );
}
