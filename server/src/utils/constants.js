export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  SELLER: 'seller',
  ADMIN: 'admin',
});
export const ROLE_VALUES = Object.values(ROLES);

export const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
});
export const USER_STATUS_VALUES = Object.values(USER_STATUS);

export const COOKIE_NAMES = Object.freeze({
  access: 'accessToken',
  refresh: 'refreshToken',
  csrf: 'csrfToken',
});

/** The refresh cookie is only sent to the auth routes, never to product/order APIs. */
export const REFRESH_COOKIE_PATH = '/api/auth';

export const PRODUCT_STATUS = Object.freeze({
  ACTIVE: 'active', // visible in the marketplace
  INACTIVE: 'inactive', // hidden by the seller
  DELETED: 'deleted', // soft-deleted (kept so past orders still resolve)
});
export const PRODUCT_STATUS_VALUES = Object.values(PRODUCT_STATUS);

export const MODERATION_STATUS = Object.freeze({
  APPROVED: 'approved',
  REMOVED: 'removed', // taken down by an admin (Phase 6)
});
export const MODERATION_STATUS_VALUES = Object.values(MODERATION_STATUS);

export const SELLER_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});
export const SELLER_STATUS_VALUES = Object.values(SELLER_STATUS);

export const MAX_PRODUCT_IMAGES = 6;

// ---------- Phase 4: shopping ----------
export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
});
export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

/** Forward progress of a shipment. The parent order shows the LEAST advanced active shipment. */
export const ORDER_PROGRESS = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

/** The only legal status changes (enforced for sellers in Phase 5). */
export const ORDER_TRANSITIONS = Object.freeze({
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['returned'],
  returned: ['refunded'],
  cancelled: [],
  refunded: [],
});

/** A customer may cancel until the seller has handed the parcel to a courier. */
export const CUSTOMER_CANCELLABLE = Object.freeze(['pending', 'confirmed', 'processing']);

export const PAYMENT_METHOD = Object.freeze({ COD: 'cod', RAZORPAY: 'razorpay' });
export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHOD);
export const PAYMENT_STATUS = Object.freeze({ PENDING: 'pending', PAID: 'paid', FAILED: 'failed', REFUNDED: 'refunded' });
export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);

export const CART_LIMITS = Object.freeze({ MAX_QTY_PER_ITEM: 10, MAX_DISTINCT_ITEMS: 30 });
export const MAX_ADDRESSES = 10;
export const MAX_WISHLIST_ITEMS = 200;

/** Shipping is charged per seller shipment: free from Rs 500, otherwise a flat Rs 40 (amounts in paise). */
export const SHIPPING = Object.freeze({ FREE_ABOVE_PAISE: 50_000, FLAT_FEE_PAISE: 4_000 });

export const INDIAN_STATES = Object.freeze([
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
]);
