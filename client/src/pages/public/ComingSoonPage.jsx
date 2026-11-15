import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';

export default function ComingSoonPage({ title, phase, description }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-prose text-lg text-ink-700">{description}</p>
      <p className="mt-6 rounded-lg border border-ink-100 bg-white p-4 text-sm text-ink-700">
        This page is built in <strong>Phase {phase}</strong> of the project. The route and navigation
        already work, so nothing needs rewiring later.
      </p>
      <Button as={Link} to="/" variant="secondary" className="mt-8">
        Back to home
      </Button>
    </div>
  );
}
