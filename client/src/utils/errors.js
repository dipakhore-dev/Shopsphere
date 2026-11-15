/**
 * Turns any Axios/JS error into a message that is safe and useful to show a user.
 * Prefers the message (and field details) sent by our API's error envelope.
 */
export function getErrorMessage(error) {
  const data = error?.response?.data;

  if (data?.errors?.length) {
    return data.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join('. ');
  }
  if (data?.message) return data.message;

  if (error?.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Check your connection and that the API is running.';
  }
  return error?.message || 'Something went wrong. Please try again.';
}
