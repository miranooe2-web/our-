import { useStore } from "../store";
import { dayOfYear } from "../utils/date";
import { IconBell, IconHeart } from "./icons";

/**
 * DailyLoveNoteView — the "Message of the Day" card.
 * The index is derived from the calendar (day-of-year), so both devices
 * always see the same note on the same day. A Web Notification is fired
 * at the admin's chosen time (see App.tsx + Admin → reminders).
 */
export function DailyLoveNote() {
  const { data } = useStore();
  const msgs = data.dailyMessages.map((m) => m.trim()).filter(Boolean);
  const today = dayOfYear(new Date());
  const index = msgs.length ? today % msgs.length : 0;
  const msg = msgs.length ? msgs[index] : "Add a message in the Admin tab and it will appear here every day.";

  return (
    <section
      className="animate-fade-up rounded-[1.75rem] bg-gradient-to-br from-rose-100 via-rose-50 to-amber-50 p-6 shadow-lg shadow-rose-100/60 ring-1 ring-rose-200/70"
      style={{ animationDelay: "90ms" }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-500">
          <IconHeart filled className="h-3.5 w-3.5" />
          Message of the day
        </p>
        {msgs.length > 0 && (
          <span className="text-[10px] font-medium text-rose-400/90">
            No. {index + 1} of {msgs.length}
          </span>
        )}
      </div>

      <p className="mt-3 font-romantic text-[19px] leading-relaxed text-rose-950">
        &ldquo;{msg}&rdquo;
      </p>

      <p className="mt-3.5 flex items-center gap-1.5 text-[11px] text-rose-400">
        <IconBell className="h-3.5 w-3.5" />
        A new one arrives daily at {data.dailyTime}
      </p>
    </section>
  );
}
