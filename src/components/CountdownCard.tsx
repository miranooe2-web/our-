import { useEffect, useState } from "react";
import { useMediaSrc, useStore } from "../store";
import {
  anniversaryCountdown,
  elapsedSince,
  formatDate,
  pad2,
} from "../utils/date";
import { IconHeart } from "./icons";

/** Re-renders on an interval — the ticking heartbeat of the app. */
function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function ordinal(n: number): string {
  if (n % 100 === 11 || n % 100 === 12 || n % 100 === 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/**
 * RelationshipTrackerView — the header card with the dual countdown engine:
 * time ELAPSED together (years / months / days, ticking sub-day) and a live
 * countdown to the NEXT anniversary with a progress bar.
 */
export function CountdownCard() {
  const { data } = useStore();
  const now = useNow(1000);
  const heroSrc = useMediaSrc(data.heroImage);

  const elapsed = elapsedSince(data.startDate, now);
  const ann = anniversaryCountdown(data.startDate, data.anniversaryDate, now);
  const pct = Math.round(ann.progress * 100);

  return (
    <section className="relative overflow-hidden rounded-[1.9rem] shadow-xl shadow-rose-300/50 animate-fade-up">
      {/* Background: shared hero photo or dynamic gradient */}
      {heroSrc ? (
        <>
          <img
            src={heroSrc}
            alt="Us"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/85 via-rose-900/60 to-rose-950/80" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-rose-400 to-amber-300" />
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15" />
          <div className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-amber-200/25" />
          <div className="absolute right-16 bottom-10 h-6 w-6 rounded-full bg-white/25" />
        </>
      )}

      <div className="relative p-6 text-white">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
            Together since {formatDate(data.startDate)}
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur">
            <IconHeart filled className="h-4 w-4 animate-heartbeat" />
          </span>
        </div>

        {/* Couple names */}
        <h2 className="mt-4 font-romantic text-[27px] leading-tight">
          {data.myName} <span className="opacity-75">&amp;</span> {data.partnerName}
        </h2>
        <p className="mt-0.5 text-xs text-white/75">
          {elapsed.days > 0 ? "and counting, every single second" : "the story is just beginning"}
        </p>

        {/* Elapsed counter: X years, Y months, Z days */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {[
            { v: elapsed.years, l: "Years" },
            { v: elapsed.months, l: "Months" },
            { v: elapsed.days, l: "Days" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl bg-white/15 px-2 py-3 text-center ring-1 ring-white/25 backdrop-blur"
            >
              <div className="font-romantic tnum text-3xl leading-none">{s.v}</div>
              <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                {s.l}
              </div>
            </div>
          ))}
        </div>
        <p className="tnum mt-2.5 text-center text-xs text-white/85">
          plus {elapsed.hours}h {pad2(elapsed.minutes)}m {pad2(elapsed.seconds)}s
        </p>

        <div className="my-4 h-px bg-white/25" />

        {/* Next anniversary + live countdown */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Next anniversary
            </p>
            <p className="mt-1 font-romantic text-lg leading-tight">
              {ann.isToday
                ? "It's today!"
                : ann.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </p>
          </div>
          <p className="pb-0.5 text-right text-[11px] text-white/80">
            {ann.isToday
              ? "happy anniversary, us"
              : `until our ${ann.yearNumber === 1 ? "first" : `${ann.yearNumber}${ordinal(ann.yearNumber)}`}`}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { v: String(ann.days), l: "Days" },
            { v: pad2(ann.hours), l: "Hrs" },
            { v: pad2(ann.minutes), l: "Min" },
            { v: pad2(ann.seconds), l: "Sec" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-xl bg-white/10 py-2 text-center ring-1 ring-white/20"
            >
              <div className="tnum text-lg font-semibold leading-none">{s.v}</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/65">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* Progress through the current relationship year */}
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-200 to-white transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="tnum mt-1.5 text-[11px] text-white/80">
            {pct}% of the way through year {ann.yearNumber}
          </p>
        </div>
      </div>
    </section>
  );
}
