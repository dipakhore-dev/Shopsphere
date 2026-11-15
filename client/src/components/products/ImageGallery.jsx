import { useState } from 'react';
import SafeImage from '../common/SafeImage.jsx';
import { cn } from '../../utils/cn.js';
import { optimizeImageUrl } from '../../utils/images.js';

export default function ImageGallery({ images, alt }) {
  const [active, setActive] = useState(0);
  if (!images.length) return <div className="aspect-square rounded-2xl bg-ink-100" />;

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="aspect-square flex-1 overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <SafeImage src={optimizeImageUrl(images[active].url, 1000)} alt={alt} className="size-full object-contain" />
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-pressed={i === active}
                className={cn(
                  'size-16 overflow-hidden rounded-lg border-2 bg-white sm:size-20',
                  i === active ? 'border-brand-600' : 'border-transparent hover:border-ink-300',
                )}
              >
                <SafeImage src={optimizeImageUrl(img.url, 160)} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
