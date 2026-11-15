export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  SELLER: 'seller',
  ADMIN: 'admin',
});

/** Where each role lands after logging in. */
export function getDashboardPath(role) {
  switch (role) {
    case ROLES.ADMIN:
      return '/admin';
    case ROLES.SELLER:
      return '/seller';
    default:
      return '/account';
  }
}
