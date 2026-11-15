export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-16 text-center">
      {Icon && <Icon className="size-10 text-ink-300" aria-hidden="true" />}
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      {children && <p className="mt-2 max-w-md text-ink-700">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
