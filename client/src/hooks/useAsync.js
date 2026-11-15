import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { getErrorMessage } from '../utils/errors.js';

/**
 * Runs `asyncFn(signal)` whenever `deps` change and exposes { status, data, error, httpStatus, reload }.
 * - requests are aborted when deps change or the component unmounts (no stale responses)
 * - previous data is kept while reloading so lists do not flash empty
 */
export function useAsync(asyncFn, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null, httpStatus: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: 'loading', error: null, httpStatus: null }));

    asyncFn(controller.signal)
      .then((data) => setState({ status: 'success', data, error: null, httpStatus: null }))
      .catch((err) => {
        if (axios.isCancel(err)) return;
        setState({ status: 'error', data: null, error: getErrorMessage(err), httpStatus: err.response?.status ?? null });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
