import { cn } from '../../utils/cn.js';

export default function Spinner({ className = 'size-4', label = 'Loading' }) {
  return (
    <span role="status" className={cn('inline-flex shrink-0 items-center', className)}>
      <svg className="size-full animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
