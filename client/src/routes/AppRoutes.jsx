import { Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import HomePage from '../pages/public/HomePage.jsx';
import ComingSoonPage from '../pages/public/ComingSoonPage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';
import LoginPage from '../pages/public/LoginPage.jsx';
import RegisterPage from '../pages/public/RegisterPage.jsx';
import ForgotPasswordPage from '../pages/public/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/public/ResetPasswordPage.jsx';
import VerifyEmailPage from '../pages/public/VerifyEmailPage.jsx';
import ProductListingPage from '../pages/public/ProductListingPage.jsx';
import ProductDetailsPage from '../pages/public/ProductDetailsPage.jsx';
import AccountPage from '../pages/customer/AccountPage.jsx';
import SellerLayout from '../layouts/SellerLayout.jsx';
import SellerHomePage from '../pages/seller/SellerHomePage.jsx';
import SellerProductsPage from '../pages/seller/SellerProductsPage.jsx';
import ProductEditorPage from '../pages/seller/ProductEditorPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import GuestRoute from './GuestRoute.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import { placeholderRoutes } from './placeholderRoutes.js';
import { ROLES } from '../utils/roles.js';

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />

          {/* Marketplace */}
          <Route path="products" element={<ProductListingPage />} />
          <Route path="products/:id" element={<ProductDetailsPage />} />
          <Route path="search" element={<ProductListingPage />} />
          <Route path="category/:slug" element={<ProductListingPage />} />

          {placeholderRoutes.map(({ path, ...page }) => (
            <Route key={path} path={path} element={<ComingSoonPage {...page} />} />
          ))}

          {/* Only for visitors who are NOT logged in */}
          <Route element={<GuestRoute />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>

          {/* Token-link pages work whether or not you are logged in */}
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />

          {/* Any logged-in user */}
          <Route element={<ProtectedRoute />}>
            <Route path="account" element={<AccountPage />} />
          </Route>

          {/* Role-restricted areas (real pages arrive in Phases 5 and 6) */}
          <Route element={<ProtectedRoute roles={[ROLES.SELLER]} />}>
            <Route path="seller" element={<SellerLayout />}>
              <Route index element={<SellerHomePage />} />
              <Route path="products" element={<SellerProductsPage />} />
              <Route path="products/new" element={<ProductEditorPage />} />
              <Route path="products/:id/edit" element={<ProductEditorPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
            <Route
              path="admin"
              element={
                <ComingSoonPage
                  title="Admin dashboard"
                  phase={6}
                  description="Seller approvals, moderation and marketplace analytics."
                />
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
