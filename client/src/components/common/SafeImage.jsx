import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * <img> that never shows a broken-image icon: if the file is missing, blocked
 * or fails to load, a neutral placeholder with the same size is rendered instead.
 */
export default function SafeImage({ src, alt = '', className, ...props }) {
  const [failed, setFailed] = useState(false);

  // A new src (e.g. another thumbnail) gets a fresh attempt.
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : 'true'}
        className={cn('flex items-center justify-center bg-ink-100 text-ink-300', className)}
      >
        <ImageOff className="size-1/3 max-h-10 min-h-4 max-w-10 min-w-4" aria-hidden="true" />
      </span>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} {...props} />;
}
