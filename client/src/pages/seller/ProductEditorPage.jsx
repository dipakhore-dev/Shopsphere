import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProductForm from '../../components/seller/ProductForm.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import Button from '../../components/common/Button.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { createProduct, getMyProduct, updateProduct } from '../../services/sellerProduct.service.js';
import { getErrorMessage } from '../../utils/errors.js';

/** One page for both /seller/products/new and /seller/products/:id/edit. */
export default function ProductEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { status, data: product, error, httpStatus, reload } = useAsync(
    (signal) => (isEdit ? getMyProduct(id, signal) : Promise.resolve(null)),
    [id],
  );

  const handleSubmit = async (payload) => {
    try {
      if (isEdit) {
        await updateProduct(id, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      navigate('/seller/products');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (isEdit && status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-brand-600">
        <Spinner className="size-8" label="Loading product" />
      </div>
    );
  }

  if (isEdit && status === 'error') {
    return httpStatus === 404 ? (
      <div>
        <h1 className="text-3xl font-bold">Product not found</h1>
        <p className="mt-2 text-ink-700">It does not exist or does not belong to your store.</p>
        <Button as={Link} to="/seller/products" className="mt-6">Back to my products</Button>
      </div>
    ) : (
      <ErrorState message={error} onRetry={reload} />
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{isEdit ? 'Edit product' : 'Add a product'}</h1>
      {isEdit && product?.moderationStatus === 'removed' && (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-danger-600">
          An administrator removed this product{product.moderationReason ? `: ${product.moderationReason}` : '.'} It cannot be edited.
        </p>
      )}
      <ProductForm key={product?.id ?? 'new'} product={product} onSubmit={handleSubmit} submitLabel={isEdit ? 'Save changes' : 'Create product'} />
    </div>
  );
}
