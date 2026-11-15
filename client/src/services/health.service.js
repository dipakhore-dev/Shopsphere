import api from './api.js';

/** GET /api/health -> { status, environment, uptimeSeconds, timestamp, database } */
export async function getHealth(signal) {
  const { data } = await api.get('/health', { signal });
  return data.data;
}
