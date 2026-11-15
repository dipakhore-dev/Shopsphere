import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getHealth } from '../services/health.service.js';
import { getErrorMessage } from '../utils/errors.js';

/**
 * Calls GET /api/health on mount and exposes { status, data, error, retry }.
 * status: 'loading' | 'success' | 'error'
 */
export function useHealthCheck() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const controllerRef = useRef(null);

  const check = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const data = await getHealth(controller.signal);
      setState({ status: 'success', data, error: null });
    } catch (err) {
      if (axios.isCancel(err)) return; // superseded by a newer request or unmounted
      setState({ status: 'error', data: null, error: getErrorMessage(err) });
    }
  }, []);

  useEffect(() => {
    check();
    return () => controllerRef.current?.abort();
  }, [check]);

  return { ...state, retry: check };
}
