import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

function readStoredValue<T>(key: string, fallback: T, parse: (raw: string) => T): T {
  try {
    const rawValue = localStorage.getItem(key);
    if (rawValue === null) {
      return fallback;
    }

    return parse(rawValue);
  } catch {
    return fallback;
  }
}

export function usePersistentState<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T,
  serialize: (value: T) => string,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => readStoredValue(key, fallback, parse));

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(state));
    } catch {
      // Persistence is best-effort.
    }
  }, [key, serialize, state]);

  return [state, setState];
}