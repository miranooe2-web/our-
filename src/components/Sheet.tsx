import type { ReactNode } from "react";
import { IconX } from "./icons";

/**
 * Modern iOS-style bottom sheet with a spring-in animation.
 * Centered to match the app frame on desktop.
 */
export function BottomSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-rose-950/45 backdrop-blur-[3px] animate-fade-in"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px]">
        <div className="relative mx-2 mb-2 max-h-[86dvh] overflow-y-auto no-scrollbar rounded-[2rem] bg-white p-6 pb-8 shadow-2xl shadow-rose-950/30 ring-1 ring-rose-100 animate-sheet-up md:mb-6 md:rounded-[2.25rem]">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-400 transition hover:bg-rose-100 hover:text-rose-600 active:scale-95"
          >
            <IconX className="h-4.5 w-4.5" />
          </button>
          {/* grabber */}
          <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-rose-200/70" />
          {children}
        </div>
      </div>
    </div>
  );
}
