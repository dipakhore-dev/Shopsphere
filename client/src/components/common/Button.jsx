import { cn } from '../../utils/cn.js';
import Spinner from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  accent: 'bg-marigold-500 text-ink-900 hover:bg-marigold-600',
  secondary: 'bg-white text-ink-900 border border-ink-100 hover:bg-ink-50',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'bg-danger-600 text-white hover:bg-red-800',
  dangerGhost: 'text-danger-600 hover:bg-red-50',
  outlineLight: 'border border-white/25 text-white hover:bg-white/10',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

/**
 * Polymorphic button. Render it as a router link with `as={Link} to="/x"`.
 */
export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...props
}) {
  const isNativeButton = Component === 'button';

  return (
    <Component
      {...(isNativeButton ? { type, disabled: loading || disabled } : {})}
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </Component>
  );
}
