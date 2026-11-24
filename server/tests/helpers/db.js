import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replSet;

/**
 * Starts a throw-away single-node REPLICA SET in memory. MongoDB transactions (used for orders)
 * only work on replica sets. The first run downloads a mongod binary, then it is cached.
 */
export async function startTestDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri(), { dbName: 'shopsphere_test' });

  // Build unique / TTL / text indexes before the first test runs.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export async function stopTestDb() {
  await mongoose.disconnect();
  await replSet?.stop();
}
