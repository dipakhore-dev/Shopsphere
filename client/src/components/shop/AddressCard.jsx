import { MapPin } from 'lucide-react';

export function formatAddressLines(a) {
  return [a.line1, a.line2, a.landmark && `Near ${a.landmark}`, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean);
}

export default function AddressCard({ address, children }) {
  return (
    <div>
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <MapPin className="size-4 text-brand-600" aria-hidden="true" />
        {address.fullName}
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium capitalize text-ink-700">{address.type}</span>
        {address.isDefault && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Default</span>}
      </p>
      <address className="mt-1.5 text-sm not-italic leading-relaxed text-ink-700">
        {formatAddressLines(address).map((line) => (<span key={line} className="block">{line}</span>))}
        <span className="block">Mobile: {address.phone}</span>
      </address>
      {children}
    </div>
  );
}
