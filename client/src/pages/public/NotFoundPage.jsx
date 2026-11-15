import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="font-display text-7xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 text-3xl font-bold">We could not find that page</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-700">
        The link may be broken or the page may have moved. Head back home and try again.
      </p>
      <Button as={Link} to="/" className="mt-8">
        Go to home
      </Button>
    </div>
  );
}
