import { useEffect, useState } from "react";
import { useStore } from "../store";
import { MOTIFS } from "../theme";
import { resolveMedia } from "../utils/mediaStore";
import { IconCalendar, IconHeart, IconX } from "./icons";

/**
 * MemoriesView — gallery grid of milestone cards.
 * Each card: photo (or placeholder art), date badge, title + location.
 * Tapping opens a real pop-up with the full-size image and love letter.
 */
export function MemoriesView() {
  const { data } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId ? data.memories.find((m) => m.id === activeId) ?? null : null;
  // Photos are stored as "media:<hash>" references; resolve each to a URL.
  // (Called in a loop, so it can't be the useMediaSrc hook.)
  const src = (v: string | null) => resolveMedia(v, data.remoteEndpoint);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <div className="animate-fade-up">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="font-romantic text-[22px] text-rose-950">Our story, in pictures</h2>
        <span className="text-[11px] font-medium text-rose-400">tap a picture to open it</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.memories.map((m, i) => {
          const motif = MOTIFS[m.motif] ?? MOTIFS.camera;
          const imageSrc = src(m.image);
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className="animate-fade-up group relative aspect-[4/5] overflow-hidden rounded-3xl text-left shadow-sm shadow-rose-200/60 ring-1 ring-rose-100 transition duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={m.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${motif.gradient}`}>
                  <motif.icon className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/85 drop-shadow-sm" />
                  <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/30" />
                  <div className="absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-white/20" />
                </div>
              )}

              <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-900 shadow-sm backdrop-blur">
                {m.dateLabel}
              </span>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-rose-950/75 via-rose-950/30 to-transparent px-3.5 pb-3.5 pt-10">
                <p className="font-romantic text-[15px] leading-tight text-white">{m.title}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-white/80">{m.location}</p>
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-rose-950/60 p-4 backdrop-blur-[4px] animate-fade-in" role="dialog" aria-modal="true" aria-label={active.title} onClick={() => setActiveId(null)}>
          <div
            className="animate-pop relative max-h-[92dvh] w-full max-w-[430px] overflow-y-auto no-scrollbar rounded-[2rem] bg-white p-4 shadow-2xl shadow-rose-950/30 ring-1 ring-white/60"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label="Close memory"
              className="absolute right-6 top-6 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-rose-500 shadow-lg shadow-rose-950/10 ring-1 ring-rose-100 backdrop-blur transition hover:bg-rose-50 active:scale-95"
            >
              <IconX className="h-5 w-5" />
            </button>

            {src(active.image) ? (
              <img
                src={src(active.image) ?? undefined}
                alt={active.title}
                className="max-h-[62dvh] w-full rounded-[1.5rem] bg-rose-50 object-contain"
              />
            ) : (
              (() => {
                const motif = MOTIFS[active.motif] ?? MOTIFS.camera;
                return (
                  <div className={`relative grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${motif.gradient}`}>
                    <motif.icon className="h-14 w-14 text-white/85 drop-shadow-sm" />
                    <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/30" />
                    <div className="absolute -bottom-6 -left-8 h-20 w-20 rounded-full bg-white/20" />
                  </div>
                );
              })()
            )}

            <div className="px-1 pb-2 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-100">
                  <IconCalendar className="h-3.5 w-3.5" />
                  {active.dateLabel}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
                  <IconHeart filled className="h-3 w-3" />
                  {active.location}
                </span>
              </div>

              <h3 className="mt-3 font-romantic text-[26px] leading-tight text-rose-950">
                {active.title}
              </h3>

              <div className="mt-4 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50/70 p-5 ring-1 ring-rose-100">
                <p className="whitespace-pre-line font-romantic text-[16.5px] leading-relaxed text-rose-950/90">
                  {active.letter}
                </p>
                <p className="mt-4 text-right font-romantic text-[15px] italic text-rose-400">
                  &mdash; with love, {data.myName}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
