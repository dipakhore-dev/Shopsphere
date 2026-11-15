import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Plus, Trash2 } from 'lucide-react';
import FormField from '../common/FormField.jsx';
import Button from '../common/Button.jsx';
import ImageUploader from './ImageUploader.jsx';
import { paiseToRupees, rupeesToPaise } from '../../utils/money.js';

const textareaClass = 'w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300';
const selectClass = 'h-11 w-full rounded-lg border bg-white px-3 text-sm text-ink-900';

/** API product -> form values (paise -> rupees, arrays -> text). */
function toFormValues(p) {
  if (!p) {
    return { name: '', brand: '', category: '', price: '', discountPrice: '', stock: '', lowStockThreshold: 5, status: 'active', description: '', tags: '', specifications: [] };
  }
  return {
    name: p.name,
    brand: p.brand,
    category: p.category.id,
    price: paiseToRupees(p.price),
    discountPrice: p.discountPrice != null ? paiseToRupees(p.discountPrice) : '',
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    status: p.status,
    description: p.description,
    tags: (p.tags ?? []).join(', '),
    specifications: p.specifications ?? [],
  };
}

/** Form values -> API payload (rupees -> paise). */
function toPayload(values, images, isEdit, includeImages) {
  const payload = {
    name: values.name.trim(),
    brand: values.brand.trim(),
    category: values.category,
    description: values.description.trim(),
    price: rupeesToPaise(values.price),
    stock: Number(values.stock),
    lowStockThreshold: Number(values.lowStockThreshold),
    status: values.status,
    tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
    specifications: values.specifications
      .map((s) => ({ key: s.key.trim(), value: s.value.trim() }))
      .filter((s) => s.key && s.value),
  };
  // On edit, only send images when the seller actually changed them. (Demo products have no
  // Cloudinary id, and untouched images need no re-validation.)
  if (includeImages) payload.images = images.map(({ url, publicId }) => ({ url, publicId }));
  if (values.discountPrice !== '' && values.discountPrice != null) payload.discountPrice = rupeesToPaise(values.discountPrice);
  else if (isEdit) payload.discountPrice = null; // clears an existing discount
  return payload;
}

export default function ProductForm({ product, onSubmit, submitLabel }) {
  const isEdit = Boolean(product);
  const categories = useSelector((s) => s.catalog.categories);
  const [images, setImages] = useState(product?.images ?? []);
  const [imageError, setImageError] = useState('');
  const [imagesDirty, setImagesDirty] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: toFormValues(product) });
  const { fields, append, remove } = useFieldArray({ control, name: 'specifications' });

  const submit = async (values) => {
    if (images.length === 0) {
      setImageError('Add at least one image');
      return;
    }
    await onSubmit(toPayload(values, images, isEdit, !isEdit || imagesDirty));
  };

  const whole = (label) => (v) => Number.isInteger(Number(v)) || `${label} must be a whole number`;

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-ink-100 bg-white p-5 sm:p-6" aria-labelledby="basics">
        <h2 id="basics" className="text-xl font-bold">Basic information</h2>
        <FormField label="Product name" error={errors.name?.message} {...register('name', { required: 'Enter a product name', minLength: { value: 3, message: 'At least 3 characters' }, maxLength: { value: 150, message: 'At most 150 characters' }, validate: (v) => !/[<>]/.test(v) || 'Cannot contain < or >' })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Brand" error={errors.brand?.message} {...register('brand', { required: 'Enter the brand', maxLength: { value: 60, message: 'At most 60 characters' } })} />
          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium">Category</label>
            <select id="category" aria-invalid={errors.category ? 'true' : 'false'} className={`${selectClass} ${errors.category ? 'border-danger-600' : 'border-ink-300'}`} {...register('category', { required: 'Choose a category' })}>
              <option value="">Select a category</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            {errors.category && <p role="alert" className="mt-1.5 text-sm text-danger-600">{errors.category.message}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Description</label>
          <textarea id="description" rows={6} aria-invalid={errors.description ? 'true' : 'false'} className={`${textareaClass} ${errors.description ? 'border-danger-600' : 'border-ink-300'}`} {...register('description', { required: 'Enter a description', minLength: { value: 10, message: 'At least 10 characters' }, maxLength: { value: 5000, message: 'At most 5000 characters' }, validate: (v) => !/[<>]/.test(v) || 'Cannot contain < or >' })} />
          {errors.description && <p role="alert" className="mt-1.5 text-sm text-danger-600">{errors.description.message}</p>}
        </div>
        <FormField label="Search keywords" hint="Comma separated, up to 10 (for example: earbuds, bluetooth, audio)" error={errors.tags?.message} {...register('tags', { validate: (v) => v.split(',').map((t) => t.trim()).filter(Boolean).length <= 10 || 'Use at most 10 keywords' })} />
      </section>

      <section className="space-y-4 rounded-2xl border border-ink-100 bg-white p-5 sm:p-6" aria-labelledby="pricing">
        <h2 id="pricing" className="text-xl font-bold">Pricing and stock</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Price (Rs)" type="number" step="0.01" min="1" inputMode="decimal" error={errors.price?.message} {...register('price', { required: 'Enter a price', min: { value: 1, message: 'Minimum is Rs 1' }, max: { value: 1000000, message: 'Maximum is Rs 10,00,000' }, validate: (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 || 'Use at most 2 decimal places' })} />
          <FormField label="Discount price (Rs)" type="number" step="0.01" min="1" inputMode="decimal" hint="Optional. Must be below the price." error={errors.discountPrice?.message} {...register('discountPrice', { validate: (v) => v === '' || v == null || Number(v) < Number(watch('price')) || 'Must be lower than the price' })} />
          <FormField label="Stock quantity" type="number" min="0" inputMode="numeric" error={errors.stock?.message} {...register('stock', { required: 'Enter the stock', min: { value: 0, message: 'Cannot be negative' }, max: { value: 100000, message: 'Maximum is 100000' }, validate: whole('Stock') })} />
          <FormField label="Low-stock alert at" type="number" min="0" inputMode="numeric" hint="Warn me when stock reaches this." error={errors.lowStockThreshold?.message} {...register('lowStockThreshold', { required: 'Required', min: { value: 0, message: 'Cannot be negative' }, validate: whole('Threshold') })} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-ink-100 bg-white p-5 sm:p-6" aria-labelledby="media">
        <h2 id="media" className="text-xl font-bold">Images</h2>
        <ImageUploader images={images} error={imageError} onChange={(next) => { setImages(next); setImagesDirty(true); if (next.length) setImageError(''); }} />
      </section>

      <section className="space-y-4 rounded-2xl border border-ink-100 bg-white p-5 sm:p-6" aria-labelledby="specs">
        <div className="flex items-center justify-between">
          <h2 id="specs" className="text-xl font-bold">Specifications</h2>
          <Button variant="secondary" size="sm" onClick={() => append({ key: '', value: '' })} disabled={fields.length >= 20}>
            <Plus className="size-4" aria-hidden="true" /> Add row
          </Button>
        </div>
        {fields.length === 0 && <p className="text-sm text-ink-500">Optional details such as warranty, size or material.</p>}
        {fields.map((field, i) => (
          <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <FormField label={`Name ${i + 1}`} placeholder="Warranty" {...register(`specifications.${i}.key`, { maxLength: { value: 50, message: 'Too long' } })} error={errors.specifications?.[i]?.key?.message} />
            <FormField label={`Value ${i + 1}`} placeholder="1 year" {...register(`specifications.${i}.value`, { maxLength: { value: 200, message: 'Too long' } })} error={errors.specifications?.[i]?.value?.message} />
            <Button variant="dangerGhost" onClick={() => remove(i)} aria-label={`Remove specification ${i + 1}`}>
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6" aria-labelledby="visibility">
        <h2 id="visibility" className="text-xl font-bold">Visibility</h2>
        <div className="mt-3 max-w-xs">
          <label htmlFor="status" className="mb-1.5 block text-sm font-medium">Status</label>
          <select id="status" className={`${selectClass} border-ink-300`} {...register('status')}>
            <option value="active">Active (visible to shoppers)</option>
            <option value="inactive">Inactive (hidden)</option>
          </select>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Button as={Link} to="/seller/products" variant="secondary">Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
