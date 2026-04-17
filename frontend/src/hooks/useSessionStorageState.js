import { useCallback, useEffect, useRef, useState } from "react";

function readStoredValue(key, initialValue) {
  if (typeof window === "undefined") {
    return typeof initialValue === "function" ? initialValue() : initialValue;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) {
      return typeof initialValue === "function" ? initialValue() : initialValue;
    }
    return JSON.parse(raw);
  } catch (_error) {
    return typeof initialValue === "function" ? initialValue() : initialValue;
  }
}

export default function useSessionStorageState(key, initialValue) {
  const mountedRef = useRef(true);
  const stateRef = useRef(readStoredValue(key, initialValue));
  const [state, setState] = useState(stateRef.current);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    stateRef.current = state;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch (_error) {
      // Ignore storage failures and keep the in-memory state only.
    }
  }, [key, state]);

  const setPersistentState = useCallback((valueOrUpdater) => {
    const nextValue = typeof valueOrUpdater === "function" ? valueOrUpdater(stateRef.current) : valueOrUpdater;
    stateRef.current = nextValue;

    try {
      window.sessionStorage.setItem(key, JSON.stringify(nextValue));
    } catch (_error) {
      // Ignore storage failures.
    }

    if (mountedRef.current) {
      setState(nextValue);
    }
  }, [key]);

  const clearPersistentState = useCallback(() => {
    stateRef.current = typeof initialValue === "function" ? initialValue() : initialValue;
    try {
      window.sessionStorage.removeItem(key);
    } catch (_error) {
      // Ignore storage failures.
    }
    if (mountedRef.current) {
      setState(stateRef.current);
    }
  }, [initialValue, key]);

  return [state, setPersistentState, clearPersistentState];
}
