import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../store";
import { MOTIFS } from "../theme";
import { resolveMedia } from "../utils/mediaStore";
import { IconCalendar, IconHeart, IconX } from "./icons";

/**
 * MemoriesView — gallery grid of milestone cards.
 * Each card: photo (or placeholder art), date badge, title + location.
 * Tapping opens a true full-screen lightbox so the whole image is visible.
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const activeImageSrc = active ? src(active.image) : null;

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

      {active &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex flex-col bg-rose-950/95 text-white backdrop-blur-md animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            onClick={() => setActiveId(null)}
          >
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label="Close memory"
              className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white shadow-lg ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25 active:scale-95"
            >
              <IconX className="h-5.5 w-5.5" />
            </button>

            <div className="flex min-h-0 flex-1 items-center justify-center p-3 pt-16" onClick={(e) => e.stopPropagation()}>
              {activeImageSrc ? (
                <img
                  src={activeImageSrc}
                  alt={active.title}
                  className="block max-h-full max-w-full rounded-xl object-contain shadow-2xl shadow-black/35"
                />
              ) : (
                (() => {
                  const motif = MOTIFS[active.motif] ?? MOTIFS.camera;
                  return (
                    <div className={`relative grid aspect-[16/10] w-full max-w-[900px] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br ${motif.gradient}`}>
                      <motif.icon className="h-16 w-16 text-white/85 drop-shadow-sm" />
                      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/30" />
                      <div className="absolute -bottom-6 -left-8 h-20 w-20 rounded-full bg-white/20" />
                    </div>
                  );
                })()
              )}
            </div>

            <div className="max-h-[36dvh] overflow-y-auto rounded-t-[1.75rem] bg-white px-5 pb-6 pt-4 text-rose-950 shadow-2xl shadow-black/30" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto max-w-[720px]">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-100">
                    <IconCalendar className="h-3.5 w-3.5" />
                    {active.dateLabel}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
                    <IconHeart filled className="h-3 w-3" />
                    {active.location}
                  </span>
                </div>

                <h3 className="font-romantic text-[26px] leading-tight text-rose-950">{active.title}</h3>

                <div className="mt-3 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50/70 p-4 ring-1 ring-rose-100">
                  <p className="whitespace-pre-line font-romantic text-[16.5px] leading-relaxed text-rose-950/90">
                    {active.letter}
                  </p>
                  <p className="mt-4 text-right font-romantic text-[15px] italic text-rose-400">
                    &mdash; with love, {data.myName}
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
