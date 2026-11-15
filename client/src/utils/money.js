/**
 * The API sends and receives money as integer PAISE (Rs 499.50 = 49950).
 * Convert only at the edges: format for display, parse from form inputs.
 */
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatPrice = (paise) => inr.format(paise / 100);
export const rupeesToPaise = (rupees) => Math.round(Number(rupees) * 100);
export const paiseToRupees = (paise) => paise / 100;
