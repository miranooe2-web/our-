import type { ReactElement, SVGProps } from "react";

/**
 * Hand-rolled inline SVG icon set (stroke-based, 24×24).
 * Keeps the app free of emoji and icon-font dependencies.
 */
export type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

const base = (props: SVGProps<SVGSVGElement>) => ({
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const IconHeart = (p: SVGProps<SVGSVGElement> & { filled?: boolean }) => (
  <svg {...base(p)} fill={p.filled ? "currentColor" : "none"} stroke={p.filled ? "none" : "currentColor"}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
);

export const IconImages = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="14" height="14" rx="2.5" />
    <path d="M7 5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
    <circle cx="8" cy="10" r="1.6" />
    <path d="m3 16 4-3.5 3 2.5 4-4 4 4" />
  </svg>
);

export const IconMic = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </svg>
);

export const IconGear = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.58 15a1.7 1.7 0 0 0-1.55-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.86a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10.12 3V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08c.26.62.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.88z" />
  </svg>
);

export const IconX = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </svg>
);

export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M10 14a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.4 5.5" />
    <path d="M14 10a5 5 0 0 0-7.07 0L4.1 12.83a5 5 0 0 0 7.07 7.07l1.42-1.4" />
  </svg>
);

export const IconCopy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 19h16" />
  </svg>
);

export const IconUpload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 15V3" />
    <path d="m7 8 5-5 5 5" />
    <path d="M4 19h16" />
  </svg>
);

export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5.9c0-1 1.1-1.6 2-1.1l9.4 5.6c.9.5.9 1.7 0 2.2L10 18.2c-.9.5-2-.1-2-1.1V5.9z" />
  </svg>
);

export const IconPause = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="6" y="4.5" width="4" height="15" rx="1.4" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.4" />
  </svg>
);

export const IconStop = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </svg>
);

export const IconCalendar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const IconCamera = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 8h2.5l1.5-2.5h8L17.5 8H20a1.5 1.5 0 0 1 1.5 1.5V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V9.5A1.5 1.5 0 0 1 4 8z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
);

export const IconLock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    <circle cx="12" cy="16" r="1.4" />
  </svg>
);

export const IconRefresh = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

export const IconSend = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M21 3 10.5 13.5" />
    <path d="M21 3 14 21l-3.5-7.5L3 10 21 3z" />
  </svg>
);

/* ---------------- Emotion glyphs ---------------- */

export const IconSun = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
  </svg>
);

export const IconCloudRain = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M17.5 13a4.5 4.5 0 0 0-.42-8.98 6 6 0 0 0-11.6 1.6A4 4 0 0 0 6.5 13h11z" />
    <path d="M8.5 16.5v2M12 16.5v3M15.5 16.5v2" />
  </svg>
);

export const IconDoubleHearts = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9.4 5.3a3.1 3.1 0 0 0-4.4 0l-.5.5-.5-.5a3.1 3.1 0 0 0-4.4 4.4l.5.5L5 15l4.9-4.8.5-.5.5.5L15.8 15l-4.4 4.4" transform="translate(4.6 -1.2) scale(0.92)" />
    <path d="M17.9 7.9a2.6 2.6 0 0 0-3.7 0l-.4.4-.4-.4a2.6 2.6 0 0 0-3.7 3.7l.4.4 4.1 4 4.1-4 .4-.4a2.6 2.6 0 0 0 0-3.7z" />
  </svg>
);

export const IconWind = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    <path d="M17.5 8a2.5 2.5 0 1 1 2 4H2" />
  </svg>
);

export const IconStorm = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M17.5 12a4.5 4.5 0 0 0-.42-8.98 6 6 0 0 0-11.6 1.6A4 4 0 0 0 6.5 12h11z" transform="translate(0 -1.5)" />
    <path d="m13 10.5-3 5h4l-3 5" />
  </svg>
);

export const IconMoon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7z" />
    <path d="M17.5 5.5v3M16 7h3" />
  </svg>
);

export const IconSparkle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M11 4c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6z" />
    <path d="M18.5 14.5c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z" />
  </svg>
);

/* ---------------- Memory motif glyphs ---------------- */

export const IconMug = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 9h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z" />
    <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
    <path d="M8.5 3.5c-.8 1 .8 1.5 0 2.5M12 3.5c-.8 1 .8 1.5 0 2.5" />
  </svg>
);

export const IconRoute = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="6" cy="18.5" r="2" />
    <circle cx="18" cy="5.5" r="2" />
    <path d="M8 18.5h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h6" strokeDasharray="0.1 3" />
  </svg>
);

export const IconRing = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="14.5" r="6.5" />
    <path d="m12 3 2.6 3L12 8.6 9.4 6 12 3z" />
  </svg>
);
