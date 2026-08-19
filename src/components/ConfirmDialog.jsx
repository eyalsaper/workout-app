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
      className="fixed inset-0 bg-iron-950/80 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="bg-iron-850 rounded-sm shadow-xl shadow-black/60 p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-plate-red">
          <AlertTriangle className="w-5 h-5" /> {title}
        </h3>
        <p className="text-chalk-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 font-medium text-chalk-200 hover:bg-iron-800 rounded-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 font-medium bg-plate-red text-white hover:bg-plate-red/85 rounded-sm transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
