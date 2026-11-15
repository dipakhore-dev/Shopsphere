import { useEffect, useRef } from 'react';
import Button from './Button.jsx';

/**
 * Uses the native <dialog> element: the browser provides the focus trap,
 * Esc-to-close and the backdrop, so it is accessible by default.
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, loading = false, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onCancel();
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,26rem)] rounded-2xl p-0 shadow-2xl backdrop:bg-ink-900/50"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-xl font-bold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-700">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading} variant={danger ? 'danger' : 'primary'}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
