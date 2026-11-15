import { SellerProfile } from '../models/SellerProfile.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SELLER_STATUS } from '../utils/constants.js';

/**
 * Use AFTER authenticate + authorize('seller').
 * A user with the seller role may still be suspended or rejected, so we also
 * require an APPROVED store profile, and attach it to the request.
 */
export const requireApprovedSeller = asyncHandler(async (req, _res, next) => {
  const profile = await SellerProfile.findOne({ user: req.user._id });

  if (!profile) {
    throw ApiError.forbidden('Create your seller profile first', 'SELLER_PROFILE_MISSING');
  }
  if (profile.status !== SELLER_STATUS.APPROVED) {
    throw ApiError.forbidden('Your seller account is not approved', 'SELLER_NOT_APPROVED');
  }

  req.sellerProfile = profile;
  next();
});
