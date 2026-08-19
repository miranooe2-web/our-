/**
 * Core data model for the "Ours" app.
 * Everything the admin can edit lives in a single `CoupleData` object so it
 * can be persisted, synced, exported and imported as one clean payload.
 */

/** Keys for the built-in emotion glyphs (inline SVGs — see icons.tsx). */
export type EmotionIconKey =
  | "sun"
  | "cloudRain"
  | "doubleHearts"
  | "wind"
  | "storm"
  | "moon"
  | "sparkle";

/** Soft pastel tints available for mood chips. */
export type TintKey =
  | "rose"
  | "peach"
  | "amber"
  | "sky"
  | "violet"
  | "indigo"
  | "slate"
  | "mint";

/** Placeholder art for memories that don't have a real photo yet. */
export type MotifKey = "coffee" | "road" | "ring" | "home" | "camera";

export interface Emotion {
  id: string;
  /** Chip label, e.g. "Missing you" */
  label: string;
  icon: EmotionIconKey;
  tint: TintKey;
  /** The deeply personal note shown in the modal when tapped. */
  note: string;
}

export interface Memory {
  id: string;
  title: string;
  location: string;
  /** Free-form date badge, e.g. "March 2023" */
  dateLabel: string;
  /** Data-URL of the photo (null → show the placeholder motif art). */
  image: string | null;
  /** Which placeholder art to use while there is no photo. */
  motif: MotifKey;
  /** The love letter attached to this memory. */
  letter: string;
}

export interface VoiceNote {
  id: string;
  title: string;
  /** Data-URL of the recorded audio. */
  audio: string;
  /** ISO timestamp of when it was recorded. */
  createdAt: string;
}

export interface CoupleData {
  version: number;
  /** Your (the admin's) first name. */
  myName: string;
  /** Your partner's first name. */
  partnerName: string;
  /** Relationship start date, "YYYY-MM-DD". */
  startDate: string;
  /** Anniversary date, "YYYY-MM-DD" (falls back to startDate). */
  anniversaryDate: string;
  /** Hero photo on the countdown card (null → gradient). */
  heroImage: string | null;
  /** Daily love-note reminder time, "HH:MM" (24h). */
  dailyTime: string;
  /** Rotates daily: index = day-of-year % length. */
  dailyMessages: string[];
  emotions: Emotion[];
  memories: Memory[];
  voiceNotes: VoiceNote[];
  /** 4-digit gate for the admin panel. */
  adminPin: string;
  /**
   * Optional live-sync endpoint (e.g. a jsonblob.com URL). Every device
   * that knows this URL polls it and pushes its own changes to it, so the
   * whole couple's data stays in step without sharing links.
   */
  remoteEndpoint?: string | null;
  /** ISO timestamp — last time any device changed the data (drives sync). */
  updatedAt: string;
}
