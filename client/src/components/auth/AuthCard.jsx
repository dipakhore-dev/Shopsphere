export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="mt-2 text-ink-700">{subtitle}</p>}
      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      {footer && <p className="mt-6 text-center text-sm text-ink-700">{footer}</p>}
    </div>
  );
}

export const authLinkClass = 'font-semibold text-brand-700 hover:underline';
