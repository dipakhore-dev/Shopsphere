import { useCallback, useEffect, useState } from 'react';

/** const { remaining, start } = useCountdown();  start(60) -> remaining counts 60, 59, ... 0 */
export function useCountdown() {
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const running = remaining > 0;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback((seconds) => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, []);

  return { remaining, start };
}
