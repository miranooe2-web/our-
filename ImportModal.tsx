import { IconCheck, IconX } from "./icons";

/**
 * Small centered confirmation dialog used before applying a sync update
 * or resetting the app data.
 */
export function ImportModal({
  title,
  message,
  confirmLabel = "Apply update",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-6" role="dialog" aria-modal="true">
      <div
        className="animate-fade-in absolute inset-0 bg-rose-950/50 backdrop-blur-[3px]"
        onClick={onCancel}
      />
      <div className="animate-pop relative w-full max-w-[360px] rounded-3xl bg-white p-6 shadow-2xl shadow-rose-950/30">
        <h3 className="font-romantic text-[22px] leading-tight text-rose-950">{title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-rose-500">{message}</p>
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-rose-50 py-3 text-[13px] font-semibold text-rose-500 ring-1 ring-rose-100 transition active:scale-[0.97]"
          >
            <IconX className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-400 py-3 text-[13px] font-semibold text-white shadow-lg shadow-rose-200 transition active:scale-[0.97]"
          >
            <IconCheck className="h-4 w-4" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
