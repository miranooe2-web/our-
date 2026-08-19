import type { EmotionIconKey, MotifKey, TintKey } from "./types";
import {
  IconSun,
  IconCloudRain,
  IconDoubleHearts,
  IconWind,
  IconStorm,
  IconMoon,
  IconSparkle,
  IconMug,
  IconRoute,
  IconRing,
  IconHome,
  IconCamera,
  type IconComponent,
} from "./components/icons";

/**
 * Static Tailwind class maps (kept as full strings so the JIT compiler
 * can see every class at build time).
 */
export const TINTS: Record<
  TintKey,
  { chip: string; icon: string; dot: string; label: string }
> = {
  rose:   { chip: "bg-rose-100 text-rose-700 ring-rose-200",        icon: "text-rose-500",      dot: "bg-rose-400",   label: "Rose" },
  peach:  { chip: "bg-orange-100 text-orange-700 ring-orange-200",  icon: "text-orange-500",    dot: "bg-orange-400", label: "Peach" },
  amber:  { chip: "bg-amber-100 text-amber-700 ring-amber-200",     icon: "text-amber-500",     dot: "bg-amber-400",  label: "Amber" },
  sky:    { chip: "bg-sky-100 text-sky-700 ring-sky-200",           icon: "text-sky-500",       dot: "bg-sky-400",    label: "Sky" },
  violet: { chip: "bg-violet-100 text-violet-700 ring-violet-200",  icon: "text-violet-500",    dot: "bg-violet-400", label: "Violet" },
  indigo: { chip: "bg-indigo-100 text-indigo-700 ring-indigo-200",  icon: "text-indigo-500",    dot: "bg-indigo-400", label: "Indigo" },
  slate:  { chip: "bg-slate-200 text-slate-700 ring-slate-300",     icon: "text-slate-500",     dot: "bg-slate-400",  label: "Slate" },
  mint:   { chip: "bg-emerald-100 text-emerald-700 ring-emerald-200", icon: "text-emerald-500", dot: "bg-emerald-400", label: "Mint" },
};

export const EMOTION_ICONS: Record<EmotionIconKey, IconComponent> = {
  sun: IconSun,
  cloudRain: IconCloudRain,
  doubleHearts: IconDoubleHearts,
  wind: IconWind,
  storm: IconStorm,
  moon: IconMoon,
  sparkle: IconSparkle,
};

export const MOTIFS: Record<MotifKey, { gradient: string; icon: IconComponent }> = {
  coffee: { gradient: "from-amber-200 via-orange-100 to-rose-100",      icon: IconMug },
  road:   { gradient: "from-sky-200 via-cyan-100 to-indigo-100",        icon: IconRoute },
  ring:   { gradient: "from-rose-200 via-pink-100 to-amber-100",        icon: IconRing },
  home:   { gradient: "from-emerald-200 via-teal-100 to-sky-100",       icon: IconHome },
  camera: { gradient: "from-rose-100 via-amber-100 to-orange-100",      icon: IconCamera },
};
