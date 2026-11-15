import { Link } from 'react-router-dom';
import { Package, PackagePlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { listMyProducts } from '../../services/sellerProduct.service.js';
import ErrorState from '../../components/common/ErrorState.jsx';

export default function SellerHomePage() {
  const { user } = useAuth();
  const total = useAsync((signal) => listMyProducts({ limit: 1 }, signal), []);

  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome, {user.name.split(' ')[0]}</h1>
      <p className="mt-2 text-ink-700">Manage the products in your store.</p>

      {total.status === 'error' && (
        <div className="mt-6">
          <ErrorState message={total.error} onRetry={total.reload} />
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to="/seller/products" className="rounded-2xl border border-ink-100 bg-white p-6 transition-colors hover:border-brand-500">
          <Package className="size-7 text-brand-600" aria-hidden="true" />
          <p className="mt-4 text-3xl font-bold">{total.data ? total.data.meta.total : '-'}</p>
          <p className="text-sm text-ink-700">Products listed. Open the list</p>
        </Link>
        <Link to="/seller/products/new" className="rounded-2xl border border-ink-100 bg-white p-6 transition-colors hover:border-brand-500">
          <PackagePlus className="size-7 text-brand-600" aria-hidden="true" />
          <p className="mt-4 text-xl font-bold">Add a product</p>
          <p className="text-sm text-ink-700">Photos, price, stock and details</p>
        </Link>
      </div>

      <p className="mt-8 rounded-lg border border-ink-100 bg-white p-4 text-sm text-ink-700">
        Orders, sales analytics, inventory alerts and earnings arrive in <strong>Phase 5</strong>.
      </p>
    </div>
  );
}
