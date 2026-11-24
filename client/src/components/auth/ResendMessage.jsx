import { cn } from '../../utils/cn.js';

const TONES = {
  success: 'bg-green-50 text-success-600',
  warning: 'bg-amber-50 text-ink-900',
  error: 'bg-red-50 text-danger-600',
};

/** Announces the result of a resend attempt to screen readers too. */
export default function ResendMessage({ message }) {
  if (!message) return <div aria-live="polite" />;
  return (
    <p role={message.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={cn('mt-4 rounded-lg p-3 text-sm font-medium', TONES[message.type])}>
      {message.text}
    </p>
  );
}
