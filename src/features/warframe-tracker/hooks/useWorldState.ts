import { useCallback, useEffect, useRef, useState } from 'react';

// --- Types ---


export type VoidTraderData = {
  character: string;
  location: string;
  active: boolean;
  activation: string;
  expiry: string;
};


export type WorldState = {
  voidTrader: VoidTraderData | null;
  lastUpdated: number;
};


// --- Raw API types ---


type RawVoidTrader = {
  character?: string;
  location?: string;
  activation?: string;
  expiry?: string;
  inventory?: unknown[];
};


type RawWorldState = {
  voidTrader?: RawVoidTrader;
};


// --- Helpers ---

const REFRESH_COOLDOWN_MS = 30_000;

export function formatTimeRemaining(expiryIso: string): string {
  const diff = new Date(expiryIso).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}


function parseVoidTrader(raw: RawVoidTrader | undefined): VoidTraderData | null {
  if (!raw?.activation || !raw.expiry) return null;

  const now = Date.now();
  const activation = new Date(raw.activation).getTime();
  const expiry = new Date(raw.expiry).getTime();
  const active = now >= activation && now < expiry;

  return {
    character: raw.character ?? 'Baro Ki\'Teer',
    location: raw.location ?? 'Unknown',
    active,
    activation: raw.activation,
    expiry: raw.expiry,
  };
}


// --- Hook ---

export function useWorldState() {
  const [worldState, setWorldState] = useState<WorldState>({
    voidTrader: null,
    lastUpdated: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const lastFetchRef = useRef(0);

  const fetchWorldState = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('https://api.warframestat.us/pc', {
        signal,
        headers: { 'Accept-Language': 'en' },
      });

      if (!response.ok) return;

      const data = (await response.json()) as RawWorldState;

      setWorldState({
        voidTrader: parseVoidTrader(data.voidTrader),
        lastUpdated: Date.now(),
      });


      lastFetchRef.current = Date.now();
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const controller = new AbortController();
    void fetchWorldState(controller.signal);
    return () => controller.abort();
  }, [fetchWorldState]);

  const refresh = useCallback(() => {
    const elapsed = Date.now() - lastFetchRef.current;
    if (elapsed < REFRESH_COOLDOWN_MS) return false;

    void fetchWorldState();
    lastFetchRef.current = Date.now();
    return true;
  }, [fetchWorldState]);

  return {
    worldState,
    isLoading,
    refresh,
  };
}
