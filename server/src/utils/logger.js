const stamp = () => new Date().toISOString();

const silent = process.env.NODE_ENV === 'test';

function log(level, ...args) {
  if (silent && level !== 'error') return;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[${stamp()}] [${level.toUpperCase()}]`, ...args);
}

export const logger = {
  info: (...a) => log('info', ...a),
  warn: (...a) => log('warn', ...a),
  error: (...a) => log('error', ...a),
};
