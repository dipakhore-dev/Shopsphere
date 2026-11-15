import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="font-display text-7xl font-bold text-marigold-600">403</p>
      <h1 className="mt-4 text-3xl font-bold">You do not have access to this page</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-700">
        Your account does not have the role this area requires.
      </p>
      <Button as={Link} to="/" className="mt-8">
        Go to home
      </Button>
    </div>
  );
}
