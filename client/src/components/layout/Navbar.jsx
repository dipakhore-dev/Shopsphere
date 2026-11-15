import { useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import Logo from '../common/Logo.jsx';
import SearchBar from './SearchBar.jsx';
import CategoryBar from './CategoryBar.jsx';
import Button from '../common/Button.jsx';
import { closeMobileMenu, toggleMobileMenu } from '../../redux/slices/uiSlice.js';
import { logoutUser } from '../../redux/slices/authSlice.js';
import { useAuth } from '../../hooks/useAuth.js';
import { getDashboardPath } from '../../utils/roles.js';
import { cn } from '../../utils/cn.js';

const NAV_LINKS = [
  { to: '/products', label: 'Products' },
  { to: '/become-a-seller', label: 'Sell on ShopSphere' },
];

const linkClass = ({ isActive }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-100',
  );

function AccountActions({ stacked = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, initialized } = useAuth();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    toast.success('You have been logged out');
    navigate('/');
  };

  // Avoid flashing "Log in" at a visitor who is actually signed in.
  if (!initialized) return <div className="h-9 w-40" aria-hidden="true" />;

  if (user) {
    return (
      <div className={cn('flex items-center gap-2', stacked && 'grid grid-cols-2')}>
        <Button as={Link} to={getDashboardPath(user.role)} variant="secondary" size="sm">
          <LayoutDashboard className="size-4" aria-hidden="true" />
          <span className="max-w-28 truncate">{user.name.split(' ')[0]}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', stacked && 'grid grid-cols-2')}>
      <Button as={Link} to="/login" variant={stacked ? 'secondary' : 'ghost'} size="sm">
        Log in
      </Button>
      <Button as={Link} to="/register" size="sm">
        Create account
      </Button>
    </div>
  );
}

export default function Navbar() {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.mobileMenuOpen);
  const { pathname } = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    dispatch(closeMobileMenu());
  }, [pathname, dispatch]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <SearchBar className="mx-6 hidden max-w-xl flex-1 lg:block" />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block">
          <AccountActions />
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg text-ink-900 hover:bg-ink-100 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => dispatch(toggleMobileMenu())}
        >
          {open ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
        </button>
      </div>

      {/* Search is always visible on phones and tablets */}
      <div className="px-4 pb-3 lg:hidden">
        <SearchBar />
      </div>

      <CategoryBar />

      {open && (
        <div id="mobile-menu" className="border-t border-ink-100 bg-white px-4 pb-4 pt-2 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4">
            <AccountActions stacked />
          </div>
        </div>
      )}
    </header>
  );
}
