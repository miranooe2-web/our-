import { useEffect, useRef, useState } from "react";
import { IconMic, IconRefresh, IconStop } from "./icons";

const MAX_SECONDS = 90;

type Status = "idle" | "recording" | "review";

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

/**
 * Voice note recorder built on MediaRecorder.
 * Records up to 90s, previews the take, then hands the admin a data-URL
 * that gets stored with the synced app data.
 */
export function VoiceRecorder({
  onSave,
  onDone,
}: {
  onSave: (audioDataUrl: string, title: string) => void;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const previewRef = useRef<string | null>(null);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Full teardown when the sheet closes.
  useEffect(
    () => () => {
      stopTimer();
      try {
        recorderRef.current?.state === "recording" && recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      cleanupStream();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording isn't supported in this browser. Try Safari or Chrome.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32_000 } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        previewRef.current = url;
        setPreviewUrl(url);
        import("../utils/media")
          .then(({ blobToDataUrl }) => blobToDataUrl(blob))
          .then(setPendingDataUrl)
          .catch(() => setError("Could not save that recording. Try again."));
        setStatus("review");
        stopTimer();
        cleanupStream();
      };
      recorderRef.current = rec;
      rec.start(250);
      setSeconds(0);
      setStatus("recording");
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            if (recorderRef.current?.state === "recording") recorderRef.current.stop();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone unavailable. Check the browser permission and try again.");
      cleanupStream();
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const redo = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
    setPendingDataUrl(null);
    setTitle("");
    setStatus("idle");
  };

  const save = () => {
    if (!pendingDataUrl) return;
    setSaving(true);
    window.setTimeout(() => {
      onSave(pendingDataUrl, title.trim() || "A little voice note");
      onDone();
    }, 50);
  };

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="text-center">
      <h3 className="font-romantic text-2xl text-rose-950">A note, in my voice</h3>
      <p className="mt-1 text-[13px] text-rose-400">
        {status === "idle" && "Tap the microphone when you're ready. 90 seconds, no pressure."}
        {status === "recording" && "Recording… tap stop when you've said it all."}
        {status === "review" && "Sounds like you. Give it a title and save it."}
      </p>

      {error && (
        <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-[12px] font-medium text-rose-600 ring-1 ring-rose-100">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col items-center">
        {status === "recording" ? (
          <>
            <div className="relative">
              <span className="animate-ring absolute inset-0 rounded-full bg-rose-400/60" />
              <span className="animate-ring absolute inset-0 rounded-full bg-rose-400/40" style={{ animationDelay: "0.5s" }} />
              <button
                onClick={stop}
                className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-rose-400 text-white shadow-xl shadow-rose-300 transition active:scale-95"
                aria-label="Stop recording"
              >
                <IconStop className="h-8 w-8" />
              </button>
            </div>
            <p className="tnum mt-4 text-sm font-semibold text-rose-500">
              {mm}:{ss} <span className="text-rose-300">/ 1:30</span>
            </p>
          </>
        ) : status === "review" && previewUrl ? (
          <>
            <audio controls src={previewUrl} className="w-full" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title — e.g. Good morning, my love"
              className="mt-4 w-full rounded-xl bg-rose-50 px-4 py-3 text-center text-sm text-rose-950 outline-none ring-1 ring-rose-100 transition placeholder:text-rose-300 focus:ring-2 focus:ring-rose-300"
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={redo}
                className="flex items-center gap-1.5 rounded-full bg-rose-50 px-4 py-2.5 text-[13px] font-semibold text-rose-500 ring-1 ring-rose-100 transition active:scale-95"
              >
                <IconRefresh className="h-4 w-4" /> Redo
              </button>
              <button
                onClick={save}
                disabled={!pendingDataUrl || saving}
                className="flex-1 rounded-full bg-gradient-to-r from-rose-500 to-rose-400 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-rose-200 transition active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save voice note"}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={start}
              className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-amber-400 text-white shadow-xl shadow-rose-300 transition active:scale-95"
              aria-label="Start recording"
            >
              <IconMic className="h-9 w-9" />
            </button>
            <p className="mt-4 text-xs font-medium text-rose-400">Tap to start recording</p>
          </>
        )}
      </div>
    </div>
  );
}
