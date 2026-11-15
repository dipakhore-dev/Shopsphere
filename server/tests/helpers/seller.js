import crypto from 'node:crypto';
import { createClient, validUser } from './client.js';

const { User } = await import('../../src/models/User.js');
const { SellerProfile } = await import('../../src/models/SellerProfile.js');
const { setImageStorage } = await import('../../src/services/imageStorage.service.js');

/** In-memory replacement for Cloudinary. */
export function useFakeImageStorage() {
  const destroyed = [];
  setImageStorage({
    async upload(_buffer, { folder }) {
      const id = crypto.randomBytes(6).toString('hex');
      return { url: `https://res.cloudinary.com/testcloud/image/upload/v1/${folder}/${id}.png`, publicId: `${folder}/${id}` };
    },
    async destroy(publicId) {
      destroyed.push(publicId);
    },
  });
  return { destroyed };
}

/** Registers through the real API, then promotes the user to seller with a store profile. */
export async function createSellerClient(app, { email = 'seller1@example.com', storeName = 'Store One', status = 'approved' } = {}) {
  const client = await createClient(app);
  await client.post('/api/auth/register', validUser({ email }));
  const user = await User.findOneAndUpdate({ email }, { role: 'seller', isEmailVerified: true }, { new: true });
  const store = await SellerProfile.create({
    user: user._id,
    storeName,
    slug: `${storeName.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomBytes(3).toString('hex')}`,
    status,
  });
  return { ...client, user, store };
}

export async function createCustomerClient(app, email = 'customer1@example.com') {
  const client = await createClient(app);
  await client.post('/api/auth/register', validUser({ email }));
  return client;
}

/** A valid product payload whose images belong to `user`. Prices are in paise. */
export function productPayload(user, categoryId, overrides = {}) {
  return {
    name: 'Wireless Earbuds Pro',
    description: 'Noise cancelling earbuds with long battery life.',
    category: String(categoryId),
    brand: 'Auralis',
    price: 499900,
    discountPrice: 399900,
    stock: 25,
    tags: ['earbuds', 'bluetooth'],
    specifications: [{ key: 'Warranty', value: '1 year' }],
    images: [
      {
        url: `https://res.cloudinary.com/testcloud/image/upload/v1/shopsphere/products/${user._id}/abc123.png`,
        publicId: `shopsphere/products/${user._id}/abc123`,
      },
    ],
    ...overrides,
  };
}

/** Smallest buffers that pass the magic-number check. */
export const PNG_BYTES = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(32)]);
export const FAKE_PNG_TEXT = Buffer.from('this is definitely not an image, just text pretending');
