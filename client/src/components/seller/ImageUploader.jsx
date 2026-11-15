import { useId, useRef, useState } from 'react';
import SafeImage from '../common/SafeImage.jsx';
import toast from 'react-hot-toast';
import { ImagePlus, X, ArrowLeftToLine } from 'lucide-react';
import Spinner from '../common/Spinner.jsx';
import { uploadProductImages } from '../../services/sellerProduct.service.js';
import { optimizeImageUrl } from '../../utils/images.js';
import { getErrorMessage } from '../../utils/errors.js';

const MAX_IMAGES = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Controlled component: `images` is [{ url, publicId }].
 * Files are uploaded to the server (-> Cloudinary) as soon as they are chosen;
 * the form only keeps the returned URLs. The first image is the main one.
 */
export default function ImageUploader({ images, onChange, error }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow choosing the same file again
    if (files.length === 0) return;

    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`You can add up to ${MAX_IMAGES} images (${MAX_IMAGES - images.length} more).`);
      return;
    }
    const invalid = files.find((f) => !ACCEPTED.includes(f.type) || f.size > MAX_BYTES);
    if (invalid) {
      toast.error(`"${invalid.name}" must be a JPEG, PNG or WebP image under 5 MB.`);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadProductImages(files);
      onChange([...images, ...uploaded]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const remove = (index) => onChange(images.filter((_, i) => i !== index));
  const makeMain = (index) => onChange([images[index], ...images.filter((_, i) => i !== index)]);

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium" id={`${inputId}-label`}>
        Product images <span className="font-normal text-ink-500">(1 to {MAX_IMAGES}, first is the main image)</span>
      </p>

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-labelledby={`${inputId}-label`}>
        {images.map((img, i) => (
          <li key={img.url} className="relative aspect-square overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
            <SafeImage src={optimizeImageUrl(img.url, 240)} alt={`Product image ${i + 1}`} className="size-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">MAIN</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink-900/60 p-1">
              {i > 0 ? (
                <button type="button" onClick={() => makeMain(i)} aria-label={`Make image ${i + 1} the main image`} className="rounded p-1 text-white hover:bg-white/20">
                  <ArrowLeftToLine className="size-4" aria-hidden="true" />
                </button>
              ) : <span />}
              <button type="button" onClick={() => remove(i)} aria-label={`Remove image ${i + 1}`} className="rounded p-1 text-white hover:bg-white/20">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}

        {images.length < MAX_IMAGES && (
          <li>
            <label
              htmlFor={inputId}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-300 text-xs text-ink-500 hover:border-brand-500 hover:text-brand-700 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-marigold-500"
            >
              {uploading ? <Spinner className="size-6" label="Uploading images" /> : <ImagePlus className="size-6" aria-hidden="true" />}
              {uploading ? 'Uploading...' : 'Add images'}
              <input ref={inputRef} id={inputId} type="file" accept={ACCEPTED.join(',')} multiple disabled={uploading} onChange={handleFiles} className="sr-only" />
            </label>
          </li>
        )}
      </ul>

      {error && <p role="alert" className="mt-1.5 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
