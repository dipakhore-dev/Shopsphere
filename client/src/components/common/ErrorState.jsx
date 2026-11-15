import { AlertTriangle } from 'lucide-react';
import Button from './Button.jsx';

export default function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl bg-red-50 px-6 py-12 text-center">
      <AlertTriangle className="size-9 text-danger-600" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-bold text-danger-600">Something went wrong</h2>
      <p className="mt-1 max-w-md text-sm text-ink-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
