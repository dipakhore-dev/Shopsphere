import { Address } from '../models/Address.js';
import { ApiError } from '../utils/ApiError.js';
import { MAX_ADDRESSES } from '../utils/constants.js';

export const listAddresses = (userId) => Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }).lean();

/** Every lookup includes the user id: someone else's address simply "does not exist". */
async function findOwned(userId, id) {
  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) throw ApiError.notFound('Address not found');
  return address;
}

const unsetDefaults = (userId) => Address.updateMany({ user: userId, isDefault: true }, { isDefault: false });

export async function createAddress(userId, data) {
  const count = await Address.countDocuments({ user: userId });
  if (count >= MAX_ADDRESSES) throw ApiError.conflict(`You can save at most ${MAX_ADDRESSES} addresses`);

  const makeDefault = count === 0 || data.isDefault === true; // the first address is always the default
  if (makeDefault) await unsetDefaults(userId);

  return Address.create({ ...data, user: userId, isDefault: makeDefault });
}

export async function updateAddress(userId, id, data) {
  const address = await findOwned(userId, id);
  const { isDefault, ...fields } = data;

  if (isDefault === true && !address.isDefault) {
    await unsetDefaults(userId);
    address.isDefault = true;
  }
  // "isDefault: false" is ignored on purpose: there must always be a default, so pick another address instead.

  address.set(fields);
  await address.save();
  return address;
}

export async function deleteAddress(userId, id) {
  const address = await findOwned(userId, id);
  await address.deleteOne();

  if (address.isDefault) {
    const next = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
}
