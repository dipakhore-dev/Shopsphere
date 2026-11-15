/** Escapes user input before it is placed inside a RegExp (prevents regex injection / ReDoS). */
export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
