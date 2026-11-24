import * as addressService from '../services/address.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { serializeAddress } from '../utils/serializers.js';

export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.listAddresses(req.user._id);
  sendSuccess(res, { data: { addresses: addresses.map(serializeAddress) } });
});

export const createAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user._id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Address saved', data: { address: serializeAddress(address) } });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updateAddress(req.user._id, req.params.id, req.body);
  sendSuccess(res, { message: 'Address updated', data: { address: serializeAddress(address) } });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  await addressService.deleteAddress(req.user._id, req.params.id);
  sendSuccess(res, { message: 'Address deleted' });
});
