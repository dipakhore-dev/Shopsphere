import { useState } from 'react';
import SafeImage from '../../components/common/SafeImage.jsx';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, Package, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { deleteProduct, listMyProducts, updateProduct } from '../../services/sellerProduct.service.js';
import { formatPrice } from '../../utils/money.js';
import { optimizeImageUrl } from '../../utils/images.js';
import { getErrorMessage } from '../../utils/errors.js';
import { cn } from '../../utils/cn.js';

function StatusBadge({ product }) {
  if (product.moderationStatus === 'removed') {
    return <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-danger-600">Removed by admin</span>;
  }
  const active = product.status === 'active';
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', active ? 'bg-green-100 text-success-600' : 'bg-ink-100 text-ink-700')}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function SellerProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'all';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const q = useDebounce(search.trim(), 400);

  const { status: loadStatus, data, error, reload } = useAsync(
    (signal) => listMyProducts({ page, limit: 10, status, q }, signal),
    [page, status, q],
  );

  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const setParam = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteProduct(toDelete.id);
      toast.success('Product deleted');
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (product) => {
    const next = product.status === 'active' ? 'inactive' : 'active';
    try {
      await updateProduct(product.id, { status: next });
      toast.success(next === 'active' ? 'Product is now visible to shoppers' : 'Product hidden from shoppers');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const products = data?.products ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">My products</h1>
        <Button as={Link} to="/seller/products/new">
          <PackagePlus className="size-4" aria-hidden="true" /> Add product
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Search my products</span>
          <input type="search" placeholder="Search by name" value={search} onChange={(e) => { setSearch(e.target.value); setParam({ page: '' }); }} className="h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span>Status</span>
          <select value={status} onChange={(e) => setParam({ status: e.target.value === 'all' ? '' : e.target.value })} className="h-10 rounded-lg border border-ink-300 bg-white px-2 text-sm">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="mt-6">
        {loadStatus === 'error' ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loadStatus === 'loading' && !data ? (
          <div className="h-64 animate-pulse rounded-2xl bg-ink-100" role="status" aria-label="Loading products" />
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="No products yet" action={<Button as={Link} to="/seller/products/new">Add your first product</Button>}>
            {q || status !== 'all' ? 'No products match your search or filter.' : 'Products you add will appear here.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Your products</caption>
              <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Product</th>
                  <th scope="col" className="px-4 py-3">Price</th>
                  <th scope="col" className="px-4 py-3">Stock</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SafeImage src={optimizeImageUrl(p.images[0]?.url, 96)} alt="" className="size-12 shrink-0 rounded-lg bg-ink-100 object-cover" />
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-semibold">{p.name}</p>
                          <p className="text-xs text-ink-500">{p.category.name ?? ''} {p.brand && `- ${p.brand}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatPrice(p.finalPrice)}
                      {p.discountPrice != null && <span className="ml-1.5 text-xs text-ink-500 line-through">{formatPrice(p.price)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(p.stock === 0 ? 'font-semibold text-danger-600' : p.isLowStock && 'font-semibold text-marigold-600')}>{p.stock}</span>
                      {p.stock === 0 ? <span className="ml-2 text-xs text-danger-600">Out of stock</span> : p.isLowStock && <span className="ml-2 text-xs text-marigold-600">Low stock</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge product={p} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {p.moderationStatus !== 'removed' && (
                          <Button variant="ghost" size="sm" onClick={() => toggleStatus(p)}>
                            {p.status === 'active' ? 'Hide' : 'Show'}
                          </Button>
                        )}
                        <Button as={Link} to={`/products/${p.id}`} variant="ghost" size="sm" aria-label={`View ${p.name} in the store`}>
                          <Eye className="size-4" aria-hidden="true" />
                        </Button>
                        <Button as={Link} to={`/seller/products/${p.id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${p.name}`}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button variant="dangerGhost" size="sm" onClick={() => setToDelete(p)} aria-label={`Delete ${p.name}`}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => setParam({ page: String(p) })} />}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this product?"
        message={toDelete ? `"${toDelete.name}" will no longer be sold. Existing orders keep their record of it.` : ''}
        confirmLabel="Delete product"
        danger
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
