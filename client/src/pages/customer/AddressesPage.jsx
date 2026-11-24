import { useState } from 'react';
import toast from 'react-hot-toast';
import { MapPinPlus } from 'lucide-react';
import AddressCard from '../../components/shop/AddressCard.jsx';
import AddressForm from '../../components/shop/AddressForm.jsx';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { createAddress, deleteAddress, listAddresses, updateAddress } from '../../services/address.service.js';
import { getErrorMessage } from '../../utils/errors.js';

export default function AddressesPage() {
  const { status, data, error, reload } = useAsync((signal) => listAddresses(signal), []);
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (values) => {
    try {
      if (editing === 'new') await createAddress(values);
      else await updateAddress(editing.id, values);
      toast.success('Address saved');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const makeDefault = async (address) => {
    try {
      await updateAddress(address.id, { isDefault: true });
      toast.success('Default address updated');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteAddress(toDelete.id);
      toast.success('Address deleted');
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Saved addresses</h1>
        {!editing && <Button onClick={() => setEditing('new')}><MapPinPlus className="size-4" aria-hidden="true" /> Add address</Button>}
      </div>

      {editing && (
        <section aria-labelledby="addr-form-title" className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
          <h2 id="addr-form-title" className="mb-4 text-xl font-bold">{editing === 'new' ? 'New address' : 'Edit address'}</h2>
          <AddressForm key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? undefined : editing} onSubmit={save} onCancel={() => setEditing(null)} />
        </section>
      )}

      <div className="mt-6">
        {status === 'error' ? (
          <ErrorState message={error} onRetry={reload} />
        ) : status === 'loading' && !data ? (
          <div className="h-40 animate-pulse rounded-2xl bg-ink-100" role="status" aria-label="Loading addresses" />
        ) : data.length === 0 && !editing ? (
          <EmptyState title="No saved addresses" action={<Button onClick={() => setEditing('new')}>Add your first address</Button>}>
            Save an address to check out faster.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {data.map((a) => (
              <li key={a.id} className="rounded-2xl border border-ink-100 bg-white p-5">
                <AddressCard address={a}>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(a)}>Edit</Button>
                    {!a.isDefault && <Button variant="ghost" size="sm" onClick={() => makeDefault(a)}>Make default</Button>}
                    <Button variant="dangerGhost" size="sm" onClick={() => setToDelete(a)}>Delete</Button>
                  </div>
                </AddressCard>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this address?"
        message="Past orders keep their own copy of the delivery address."
        confirmLabel="Delete address"
        danger
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
