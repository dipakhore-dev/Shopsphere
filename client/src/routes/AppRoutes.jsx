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
import AddressesPage from '../pages/customer/AddressesPage.jsx';
import CartPage from '../pages/customer/CartPage.jsx';
import WishlistPage from '../pages/customer/WishlistPage.jsx';
import CheckoutPage from '../pages/customer/CheckoutPage.jsx';
import PaymentResultPage from '../pages/customer/PaymentResultPage.jsx';
import OrdersPage from '../pages/customer/OrdersPage.jsx';
import OrderDetailsPage from '../pages/customer/OrderDetailsPage.jsx';
import OrderTrackingPage from '../pages/customer/OrderTrackingPage.jsx';
import SellerLayout from '../layouts/SellerLayout.jsx';
import SellerHomePage from '../pages/seller/SellerHomePage.jsx';
import SellerProductsPage from '../pages/seller/SellerProductsPage.jsx';
import ProductEditorPage from '../pages/seller/ProductEditorPage.jsx';
import VerificationRequiredPage from '../pages/public/VerificationRequiredPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RequireVerifiedEmail from './RequireVerifiedEmail.jsx';
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
            <Route path="verify-email/required" element={<VerificationRequiredPage />} />
          </Route>

          {/* Shopping (customers and sellers; admins do not shop) */}
          <Route element={<ProtectedRoute roles={[ROLES.CUSTOMER, ROLES.SELLER]} />}>
            <Route path="cart" element={<CartPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            {/* Unverified emails are sent to the explainer page first (the API enforces it too) */}
            <Route element={<RequireVerifiedEmail />}>
              <Route path="checkout" element={<CheckoutPage />} />
            </Route>
            <Route path="payment/result" element={<PaymentResultPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailsPage />} />
            <Route path="orders/:id/tracking" element={<OrderTrackingPage />} />
            <Route path="account/addresses" element={<AddressesPage />} />
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
