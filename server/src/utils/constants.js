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
