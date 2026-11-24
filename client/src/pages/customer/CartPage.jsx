import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ShoppingBag, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import QuantityStepper from '../../components/common/QuantityStepper.jsx';
import SafeImage from '../../components/common/SafeImage.jsx';
import PriceTag from '../../components/products/PriceTag.jsx';
import OrderSummary from '../../components/shop/OrderSummary.jsx';
import { loadCart, removeCartItem, updateCartItem } from '../../redux/slices/cartSlice.js';
import { optimizeImageUrl } from '../../utils/images.js';
import { formatPrice } from '../../utils/money.js';

export default function CartPage() {
  const dispatch = useDispatch();
  const { cart, status } = useSelector((s) => s.cart);
  const [busyId, setBusyId] = useState(null);

  const run = async (productId, action) => {
    setBusyId(productId);
    try {
      await dispatch(action).unwrap();
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'Could not update your cart');
    } finally {
      setBusyId(null);
    }
  };

  if (status === 'error' && !cart) return <div className="mx-auto max-w-3xl px-4 py-12"><ErrorState message="Could not load your cart." onRetry={() => dispatch(loadCart())} /></div>;
  if (!cart) return <div className="mx-auto max-w-7xl px-4 py-12"><div className="h-64 animate-pulse rounded-2xl bg-ink-100" role="status" aria-label="Loading your cart" /></div>;

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-6 text-3xl font-bold">Your cart</h1>
        <EmptyState icon={ShoppingBag} title="Your cart is empty" action={<Button as={Link} to="/products">Start shopping</Button>}>
          Items you add will wait here until you are ready to check out.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Your cart <span className="text-lg font-medium text-ink-500">({cart.summary.itemCount} {cart.summary.itemCount === 1 ? 'item' : 'items'})</span></h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-4" aria-label="Cart items">
          {cart.items.map((item) => {
            const p = item.product;
            const busy = busyId === item.productId;
            return (
              <li key={item.productId} className={`rounded-2xl border bg-white p-4 sm:p-5 ${item.issue ? 'border-danger-600' : 'border-ink-100'}`}>
                <div className="flex gap-4">
                  <Link to={`/products/${item.productId}`} className="size-24 shrink-0 overflow-hidden rounded-xl bg-ink-50 sm:size-28">
                    <SafeImage src={optimizeImageUrl(p?.images[0]?.url, 240)} alt="" className="size-full object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    {p ? (
                      <>
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{p.brand}</p>
                        <Link to={`/products/${item.productId}`} className="line-clamp-2 font-semibold hover:text-brand-700">{p.name}</Link>
                        {p.store?.storeName && <p className="mt-0.5 text-xs text-ink-500">Sold by {p.store.storeName}</p>}
                        <div className="mt-2"><PriceTag product={p} /></div>
                      </>
                    ) : (
                      <p className="font-semibold">Unavailable product</p>
                    )}
                    {item.issueMessage && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{item.issueMessage}</p>}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
                  <div className="flex items-center gap-4">
                    {item.issue !== 'UNAVAILABLE' && item.issue !== 'OUT_OF_STOCK' && (
                      <QuantityStepper
                        value={item.quantity}
                        max={Math.min(10, item.availableStock)}
                        disabled={busy}
                        label={`Quantity of ${p?.name ?? 'product'}`}
                        onChange={(q) => run(item.productId, updateCartItem({ productId: item.productId, quantity: q }))}
                      />
                    )}
                    <Button variant="dangerGhost" size="sm" disabled={busy} onClick={() => run(item.productId, removeCartItem(item.productId))} aria-label={`Remove ${p?.name ?? 'product'} from cart`}>
                      <Trash2 className="size-4" aria-hidden="true" /> Remove
                    </Button>
                  </div>
                  {!item.issue && <p className="font-bold">{formatPrice(item.lineTotal)}</p>}
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <OrderSummary summary={cart.summary} shipments={cart.shipments}>
            {cart.canCheckout ? (
              <Button as={Link} to="/checkout" size="lg" className="w-full">Proceed to checkout</Button>
            ) : (
              <>
                <Button size="lg" className="w-full" disabled>Proceed to checkout</Button>
                <p role="status" className="mt-2 text-center text-xs text-danger-600">Fix the items marked above to continue.</p>
              </>
            )}
          </OrderSummary>
        </aside>
      </div>
    </div>
  );
}
