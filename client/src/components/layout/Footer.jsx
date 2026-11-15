import { Link } from 'react-router-dom';
import Logo from '../common/Logo.jsx';

export default function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-ink-500">
            A marketplace where independent sellers set their own prices.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-700">
          <Link to="/products" className="hover:text-brand-700">Products</Link>
          <Link to="/become-a-seller" className="hover:text-brand-700">Sell on ShopSphere</Link>
          <Link to="/about" className="hover:text-brand-700">About</Link>
          <Link to="/contact" className="hover:text-brand-700">Contact</Link>
        </nav>
      </div>
      <div className="border-t border-ink-100 py-4 text-center text-xs text-ink-500">
        &copy; {new Date().getFullYear()} ShopSphere. All rights reserved.
      </div>
    </footer>
  );
}
