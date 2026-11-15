import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, PackagePlus, Package } from 'lucide-react';
import { cn } from '../utils/cn.js';

const LINKS = [
  { to: '/seller', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/seller/products', label: 'My products', icon: Package, end: true },
  { to: '/seller/products/new', label: 'Add product', icon: PackagePlus },
];

const linkClass = ({ isActive }) =>
  cn(
    'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-ink-100',
  );

/** Sidebar on desktop, scrollable tab strip on mobile. Phase 5 adds orders, inventory, analytics and earnings here. */
export default function SellerLayout() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[14rem_1fr] lg:px-8">
      <nav aria-label="Seller dashboard" className="flex gap-1 overflow-x-auto rounded-2xl border border-ink-100 bg-white p-2 lg:sticky lg:top-40 lg:flex-col lg:self-start">
        {LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
