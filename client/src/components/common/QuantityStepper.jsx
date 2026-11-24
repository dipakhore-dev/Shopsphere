import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value, min = 1, max = 10, onChange, disabled = false, label = 'Quantity' }) {
  const btn = 'inline-flex size-9 items-center justify-center rounded-lg border border-ink-300 bg-white hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output className="w-8 text-center text-sm font-semibold" aria-live="polite">{value}</output>
      <button type="button" className={btn} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label="Increase quantity">
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
