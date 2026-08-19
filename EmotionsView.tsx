import { useState } from "react";
import { useStore } from "../store";
import type { Emotion } from "../types";
import { EMOTION_ICONS, TINTS } from "../theme";
import { IconSparkle } from "./icons";
import { BottomSheet } from "./Sheet";

/**
 * OpenWhenView — interactive mood chips.
 * Tapping a feeling opens a bottom sheet with a deeply personalized note.
 */
export function EmotionsView() {
  const { data } = useStore();
  const [active, setActive] = useState<Emotion | null>(null);

  return (
    <section className="animate-fade-up" style={{ animationDelay: "160ms" }}>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="font-romantic text-[22px] text-rose-950">Open when&hellip;</h2>
        <span className="text-[11px] font-medium text-rose-400">tap a feeling</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.emotions.map((e, i) => {
          const tint = TINTS[e.tint] ?? TINTS.rose;
          const Icon = EMOTION_ICONS[e.icon] ?? IconSparkle;
          return (
            <button
              key={e.id}
              onClick={() => setActive(e)}
              className={`animate-fade-up flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left ring-1 transition duration-200 active:scale-[0.96] ${tint.chip}`}
              style={{ animationDelay: `${200 + i * 45}ms` }}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70 shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold leading-tight">{e.label}</span>
            </button>
          );
        })}
      </div>

      {active && (
        <BottomSheet onClose={() => setActive(null)}>
          {(() => {
            const tint = TINTS[active.tint] ?? TINTS.rose;
            const Icon = EMOTION_ICONS[active.icon] ?? IconSparkle;
            return (
              <>
                <div className="flex items-center gap-3 pr-10">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 ring-1 ring-rose-100">
                    <Icon className={`h-6 w-6 ${tint.icon}`} />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-400">
                      open when you feel
                    </p>
                    <h3 className="font-romantic text-2xl text-rose-950">{active.label}</h3>
                  </div>
                </div>
                <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-rose-950/85">
                  {active.note}
                </p>
                <p className="mt-6 text-right font-romantic text-[15px] italic text-rose-400">
                  &mdash; always, {data.myName}
                </p>
              </>
            );
          })()}
        </BottomSheet>
      )}
    </section>
  );
}
