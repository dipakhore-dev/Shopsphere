const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function clean(value) {
  if (Array.isArray(value)) {
    value.forEach(clean);
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      // "$" keys are MongoDB operators ({"$gt": ""}); "." keys can address nested paths.
      if (key.startsWith('$') || key.includes('.') || BLOCKED_KEYS.has(key)) {
        delete value[key];
      } else {
        clean(value[key]);
      }
    }
  }
  return value;
}

/** Strips NoSQL-operator and prototype-pollution keys from body, query and params. */
export function sanitizeRequest(req, _res, next) {
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
}
