import crypto from 'node:crypto';
import { createClient, validUser } from './client.js';

const { User } = await import('../../src/models/User.js');

export const addressPayload = (overrides = {}) => ({
  fullName: 'Asha Verma',
  phone: '98765 43210',
  line1: '12 Park Street',
  city: 'Kolkata',
  state: 'West Bengal',
  pincode: '700016',
  ...overrides,
});

/** A logged-in customer with a verified email and (optionally) one saved address. */
export async function createShopper(app, { email = 'shopper@example.com', verified = true, withAddress = true } = {}) {
  const client = await createClient(app);
  await client.post('/api/auth/register', validUser({ email }));
  const user = await User.findOneAndUpdate({ email }, { isEmailVerified: verified }, { new: true });

  let address = null;
  if (withAddress) {
    const res = await client.post('/api/addresses', addressPayload());
    address = res.body.data.address;
  }
  return { ...client, user, address };
}

export const newKey = () => crypto.randomUUID();

/** POST /api/orders with an Idempotency-Key header. */
export function placeOrder(client, body, key = newKey()) {
  return client.agent.post('/api/orders').set('X-CSRF-Token', client.csrf).set('Idempotency-Key', key).send(body);
}

export const addToCart = (client, product, quantity = 1) =>
  client.post('/api/cart/items', { productId: String(product._id ?? product.id), quantity });
