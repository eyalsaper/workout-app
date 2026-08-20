import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}) {
  return (
    <div
      className="fixed inset-0 bg-surface-page/80 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="card shadow-xl shadow-black/60 p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-negative">
          <AlertTriangle className="w-5 h-5" /> {title}
        </h3>
        <p className="text-ink-soft mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 font-medium text-ink-soft hover:bg-surface-wash rounded-card transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-clay px-4 py-2"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
