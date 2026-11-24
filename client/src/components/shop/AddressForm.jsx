import { useForm } from 'react-hook-form';
import FormField from '../common/FormField.jsx';
import Button from '../common/Button.jsx';
import { INDIAN_STATES } from '../../utils/indianStates.js';

const selectClass = 'h-11 w-full rounded-lg border bg-white px-3 text-sm text-ink-900';
const normalisePhone = (v) => v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');

export default function AddressForm({ initial, onSubmit, onCancel, submitLabel = 'Save address' }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: initial?.fullName ?? '',
      phone: initial?.phone ?? '',
      line1: initial?.line1 ?? '',
      line2: initial?.line2 ?? '',
      landmark: initial?.landmark ?? '',
      city: initial?.city ?? '',
      state: initial?.state ?? '',
      pincode: initial?.pincode ?? '',
      type: initial?.type ?? 'home',
      isDefault: initial?.isDefault ?? false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName', { required: 'Enter the recipient name', minLength: { value: 2, message: 'Name is too short' } })} />
        <FormField label="Mobile number" type="tel" autoComplete="tel-national" inputMode="numeric" hint="10-digit Indian mobile number" error={errors.phone?.message} {...register('phone', { required: 'Enter a mobile number', validate: (v) => /^[6-9]\d{9}$/.test(normalisePhone(v)) || 'Enter a valid 10-digit mobile number' })} />
      </div>
      <FormField label="Address line 1" autoComplete="address-line1" hint="House / flat no., building, street" error={errors.line1?.message} {...register('line1', { required: 'Enter the address', minLength: { value: 3, message: 'Address is too short' } })} />
      <FormField label="Address line 2 (optional)" autoComplete="address-line2" error={errors.line2?.message} {...register('line2')} />
      <FormField label="Landmark (optional)" error={errors.landmark?.message} {...register('landmark')} />
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="City" autoComplete="address-level2" error={errors.city?.message} {...register('city', { required: 'Enter the city' })} />
        <div>
          <label htmlFor="addr-state" className="mb-1.5 block text-sm font-medium">State</label>
          <select id="addr-state" autoComplete="address-level1" aria-invalid={errors.state ? 'true' : 'false'} className={`${selectClass} ${errors.state ? 'border-danger-600' : 'border-ink-300'}`} {...register('state', { required: 'Choose a state' })}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          {errors.state && <p role="alert" className="mt-1.5 text-sm text-danger-600">{errors.state.message}</p>}
        </div>
        <FormField label="PIN code" autoComplete="postal-code" inputMode="numeric" maxLength={6} error={errors.pincode?.message} {...register('pincode', { required: 'Enter the PIN code', pattern: { value: /^[1-9]\d{5}$/, message: 'Enter a valid 6-digit PIN code' } })} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <fieldset className="flex items-center gap-4">
          <legend className="sr-only">Address type</legend>
          {['home', 'work', 'other'].map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm capitalize">
              <input type="radio" value={t} className="size-4 accent-brand-600" {...register('type')} /> {t}
            </label>
          ))}
        </fieldset>
        {!initial?.isDefault && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-brand-600" {...register('isDefault')} /> Make this my default address
          </label>
        )}
      </div>
      <div className="flex justify-end gap-3">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
