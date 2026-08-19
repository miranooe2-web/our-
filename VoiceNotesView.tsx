import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import type { VoiceNote } from "../types";
import { uid } from "../utils/media";
import { IconMic, IconPause, IconPlay, IconTrash } from "./icons";
import { BottomSheet } from "./Sheet";
import { VoiceRecorder } from "./VoiceRecorder";

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** A single playable voice-note row (reused in the Admin tab). */
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

  useEffect(() => {
    const a = new Audio(note.audio);
    audioRef.current = a;
    const onTime = () => {
      setT(a.currentTime);
      setDur(a.duration || 0);
    };
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onTime);
      a.removeEventListener("ended", onEnd);
      a.src = "";
      audioRef.current = null;
    };
  }, [note.audio]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
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
        <p className="mt-1 text-[10px] text-rose-300">
          {new Date(note.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
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
