import { useCallback, useEffect, useRef, useState } from 'react';

// --- Types ---

export type CycleData = {
  id: string;
  label: string;
  state: string;
  expiry: string;
};

export type VoidTraderData = {
  character: string;
  location: string;
  active: boolean;
  activation: string;
  expiry: string;
};

export type FissureData = {
  id: string;
  node: string;
  missionType: string;
  enemy: string;
  tier: string;
  tierNum: number;
  isHard: boolean; // Steel Path
  isStorm: boolean; // Railjack
  expiry: string;
};

export type WorldState = {
  cycles: CycleData[];
  voidTrader: VoidTraderData | null;
  fissures: FissureData[];
  lastUpdated: number;
};

// --- Raw API types ---

type RawCycle = {
  id?: string;
  state?: string;
  expiry?: string;
  timeLeft?: string;
  isDay?: boolean;
  isWarm?: boolean;
  isCorpus?: boolean;
};

type RawVoidTrader = {
  character?: string;
  location?: string;
  activation?: string;
  expiry?: string;
  inventory?: unknown[];
};

type RawFissure = {
  id?: string;
  node?: string;
  missionType?: string;
  enemy?: string;
  tier?: string;
  tierNum?: number;
  isHard?: boolean;
  isStorm?: boolean;
  expiry?: string;
};

type RawWorldState = {
  earthCycle?: RawCycle;
  cetusCycle?: RawCycle;
  vallisCycle?: RawCycle;
  cambionCycle?: RawCycle;
  zarimanCycle?: RawCycle;
  duviriCycle?: RawCycle & { choices?: unknown[] };
  voidTrader?: RawVoidTrader;
  fissures?: RawFissure[];
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

function parseCycles(data: RawWorldState): CycleData[] {
  const cycles: CycleData[] = [];

  const push = (label: string, raw: RawCycle | undefined) => {
    if (!raw?.expiry || !raw.state) return;
    cycles.push({
      id: raw.id ?? label,
      label,
      state: raw.state.charAt(0).toUpperCase() + raw.state.slice(1),
      expiry: raw.expiry,
    });
  };

  push('Earth', data.earthCycle);
  push('Cetus', data.cetusCycle);
  push('Orb Vallis', data.vallisCycle);
  push('Cambion Drift', data.cambionCycle);
  push('Zariman', data.zarimanCycle);
  push('Duviri', data.duviriCycle);

  return cycles;
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

function parseFissures(raw: RawFissure[] | undefined): FissureData[] {
  if (!raw) return [];

  const now = Date.now();
  return raw
    .filter((f) => f.id && f.node && f.tier && f.expiry && new Date(f.expiry).getTime() > now)
    .map((f) => ({
      id: f.id!,
      node: f.node!,
      missionType: f.missionType ?? 'Unknown',
      enemy: f.enemy ?? 'Unknown',
      tier: f.tier!,
      tierNum: f.tierNum ?? 0,
      isHard: f.isHard ?? false,
      isStorm: f.isStorm ?? false,
      expiry: f.expiry!,
    }))
    .sort((a, b) => a.tierNum - b.tierNum);
}

// --- Hook ---

export function useWorldState() {
  const [worldState, setWorldState] = useState<WorldState>({
    cycles: [],
    voidTrader: null,
    fissures: [],
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
        cycles: parseCycles(data),
        voidTrader: parseVoidTrader(data.voidTrader),
        fissures: parseFissures(data.fissures),
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
