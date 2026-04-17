import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../constants';
import type {
  DiscoveredMurmurSlots,
  LichDecisionLog,
  LichSolverStateId,
  LichStateDefinition,
  RequiemModId,
  RequiemSymbol,
} from '../types';
import { usePersistentState } from './usePersistentState';

const DEFAULT_DISCOVERED_MURMUR_SLOTS: DiscoveredMurmurSlots = [null, null, null];
const MAX_HISTORY_ENTRIES = 40;

const KNOWN_REQUIEM_MOD_IDS: RequiemModId[] = ['fass', 'khra', 'jahu', 'netra', 'lohk', 'ris', 'vome', 'xata', 'oull'];

const KNOWN_SOLVER_STATES: LichSolverStateId[] = [
  'ORR',
  'OAR',
  'AOB',
  'OAB',
  'BCA',
  'ABC',
  'ACB',
  'BAC',
  'CAB',
  'CBA',
  'SOLVED',
];

const STATE_DEFINITIONS: Record<LichSolverStateId, LichStateDefinition> = {
  ORR: {
    id: 'ORR',
    title: 'Preparation',
    description: 'Theoretical starting point. Move to O/A/R when murmur A is known.',
    configuration: ['O', 'R', 'R'],
    feedbackOptions: [
      {
        id: 'to-oar',
        label: 'A is known, start with O/A/R',
        nextStateId: 'OAR',
        consumesAttempt: false,
        style: 'neutral',
        requiresKnownA: true,
        messageOnBlocked: 'Add a murmur in slot A before starting.',
      },
    ],
  },
  OAR: {
    id: 'OAR',
    title: 'Encounter 1',
    description: 'Recommended configuration: O / A / R. Report the result of slot 2 (A).',
    configuration: ['O', 'A', 'R'],
    feedbackOptions: [
      {
        id: 'oar-a-failed-slot2',
        label: 'A fails in slot 2',
        nextStateId: 'AOB',
        consumesAttempt: true,
        style: 'danger',
      },
      {
        id: 'oar-a-success-slot2',
        label: 'A succeeds in slot 2',
        nextStateId: 'OAB',
        consumesAttempt: true,
        style: 'success',
      },
    ],
  },
  AOB: {
    id: 'AOB',
    title: 'Left branch - Encounter 2',
    description: 'Recommended configuration: A / O / B. Choose the observed scenario.',
    configuration: ['A', 'O', 'B'],
    feedbackOptions: [
      {
        id: 'aob-a-failed-slot1',
        label: 'A fails in slot 1',
        nextStateId: 'BCA',
        consumesAttempt: true,
        style: 'danger',
      },
      {
        id: 'aob-a-success-b-failed-slot3',
        label: 'A succeeds in slot 1 and B fails in slot 3',
        nextStateId: 'ABC',
        consumesAttempt: true,
        style: 'danger',
      },
      {
        id: 'aob-a-success-b-success-slot3',
        label: 'A succeeds in slot 1 and B succeeds in slot 3',
        nextStateId: 'ACB',
        consumesAttempt: true,
        style: 'success',
      },
    ],
  },
  OAB: {
    id: 'OAB',
    title: 'Right branch - Encounter 2',
    description: 'Recommended configuration: O / A / B. Report the result of slot 3 (B).',
    configuration: ['O', 'A', 'B'],
    feedbackOptions: [
      {
        id: 'oab-b-failed-slot3',
        label: 'B fails in slot 3',
        nextStateId: 'BAC',
        consumesAttempt: true,
        style: 'danger',
      },
      {
        id: 'oab-b-success-slot3',
        label: 'B succeeds in slot 3',
        nextStateId: 'CAB',
        consumesAttempt: true,
        style: 'success',
      },
    ],
  },
  BCA: {
    id: 'BCA',
    title: 'Left branch check',
    description: 'Test B / C / A. If it fails, the only remaining solution is C / B / A.',
    configuration: ['B', 'C', 'A'],
    feedbackOptions: [
      {
        id: 'bca-success',
        label: 'B/C/A succeeded',
        nextStateId: 'SOLVED',
        consumesAttempt: true,
        style: 'success',
      },
      {
        id: 'bca-failed',
        label: 'B/C/A failed',
        nextStateId: 'CBA',
        consumesAttempt: true,
        style: 'danger',
      },
    ],
  },
  ABC: {
    id: 'ABC',
    title: 'Final suggestion',
    description: 'Final suggested configuration: A / B / C.',
    configuration: ['A', 'B', 'C'],
    isFinalSuggestion: true,
    feedbackOptions: [
      {
        id: 'abc-success',
        label: 'A/B/C succeeded',
        nextStateId: 'SOLVED',
        consumesAttempt: true,
        style: 'success',
      },
      {
        id: 'abc-failed',
        label: 'A/B/C failed (inconsistent)',
        nextStateId: null,
        consumesAttempt: true,
        style: 'danger',
        messageOnDeadEnd: 'Inconsistent failure for this branch. Check previous feedback or start a new hunt.',
      },
    ],
  },
  ACB: {
    id: 'ACB',
    title: 'Final suggestion',
    description: 'Final suggested configuration: A / C / B.',
    configuration: ['A', 'C', 'B'],
    isFinalSuggestion: true,
    feedbackOptions: [
      {
        id: 'acb-success',
        label: 'A/C/B succeeded',
        nextStateId: 'SOLVED',
        consumesAttempt: true,
        style: 'success',
      },
      {
        id: 'acb-failed',
        label: 'A/C/B failed (inconsistent)',
        nextStateId: null,
        consumesAttempt: true,
        style: 'danger',
        messageOnDeadEnd: 'Inconsistent failure for this branch. Check previous feedback or start a new hunt.',
      },
    ],
  },
  BAC: {
    id: 'BAC',
    title: 'Final suggestion',
    description: 'Final suggested configuration: B / A / C.',
    configuration: ['B', 'A', 'C'],
    isFinalSuggestion: true,
    feedbackOptions: [
      {
        id: 'bac-success',
        label: 'B/A/C succeeded',
        nextStateId: 'SOLVED',
        consumesAttempt: true,
        style: 'success',
      },
      {
        id: 'bac-failed',
        label: 'B/A/C failed (inconsistent)',
        nextStateId: null,
        consumesAttempt: true,
        style: 'danger',
        messageOnDeadEnd: 'Inconsistent failure for this branch. Check previous feedback or start a new hunt.',
      },
    ],
  },
  CAB: {
    id: 'CAB',
    title: 'Final suggestion',
    description: 'Final suggested configuration: C / A / B.',
    configuration: ['C', 'A', 'B'],
    isFinalSuggestion: true,
    feedbackOptions: [
      {
        id: 'cab-success',
        label: 'C/A/B succeeded',
        nextStateId: 'SOLVED',
        consumesAttempt: true,
        style: 'success',
      },
      {
        id: 'cab-failed',
        label: 'C/A/B failed (inconsistent)',
        nextStateId: null,
        consumesAttempt: true,
        style: 'danger',
        messageOnDeadEnd: 'Inconsistent failure for this branch. Check previous feedback or start a new hunt.',
      },
    ],
  },
  CBA: {
    id: 'CBA',
    title: 'Last remaining permutation',
    description: 'Apply C / B / A.',
    configuration: ['C', 'B', 'A'],
    isFinalSuggestion: true,
    feedbackOptions: [
      {
        id: 'cba-success',
        label: 'C/B/A succeeded',
        nextStateId: 'SOLVED',
        consumesAttempt: true,
        style: 'success',
      },
      {
        id: 'cba-failed',
        label: 'C/B/A failed (inconsistent)',
        nextStateId: null,
        consumesAttempt: true,
        style: 'danger',
        messageOnDeadEnd: 'Inconsistent failure for this branch. Check previous feedback or start a new hunt.',
      },
    ],
  },
  SOLVED: {
    id: 'SOLVED',
    title: 'Great success',
    description: 'The combination is confirmed. You can start a new hunt.',
    configuration: null,
    feedbackOptions: [
      {
        id: 'solved-restart',
        label: 'New hunt',
        nextStateId: 'ORR',
        consumesAttempt: false,
        style: 'neutral',
      },
    ],
  },
};

function isRequiemModId(value: unknown): value is RequiemModId {
  return typeof value === 'string' && KNOWN_REQUIEM_MOD_IDS.includes(value as RequiemModId);
}

function isSolverStateId(value: unknown): value is LichSolverStateId {
  return typeof value === 'string' && KNOWN_SOLVER_STATES.includes(value as LichSolverStateId);
}

function parseDiscoveredMurmurSlots(raw: string): DiscoveredMurmurSlots {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 3) {
      return [...DEFAULT_DISCOVERED_MURMUR_SLOTS] as DiscoveredMurmurSlots;
    }

    return [
      isRequiemModId(parsed[0]) ? parsed[0] : null,
      isRequiemModId(parsed[1]) ? parsed[1] : null,
      isRequiemModId(parsed[2]) ? parsed[2] : null,
    ];
  } catch {
    return [...DEFAULT_DISCOVERED_MURMUR_SLOTS] as DiscoveredMurmurSlots;
  }
}

function serializeDiscoveredMurmurSlots(value: DiscoveredMurmurSlots): string {
  return JSON.stringify(value);
}

function parseSolverStateId(raw: string): LichSolverStateId {
  return isSolverStateId(raw) ? raw : 'ORR';
}

function parseAttemptCount(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function parseHistory(raw: string): LichDecisionLog[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is LichDecisionLog => {
        if (typeof entry !== 'object' || entry === null) {
          return false;
        }

        const record = entry as Record<string, unknown>;
        return typeof record.timestamp === 'number'
          && isSolverStateId(record.fromStateId)
          && (record.toStateId === null || isSolverStateId(record.toStateId))
          && typeof record.optionId === 'string'
          && typeof record.optionLabel === 'string'
          && typeof record.attemptCount === 'number';
      })
      .slice(-MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

function serializeHistory(value: LichDecisionLog[]): string {
  return JSON.stringify(value.slice(-MAX_HISTORY_ENTRIES));
}

export type ResolvedConfigurationSlot = {
  symbol: RequiemSymbol;
  label: string;
  modId: RequiemModId | null;
  isPlaceholder: boolean;
  isRandomResolvedToC: boolean;
};

function resolveSymbol(symbol: RequiemSymbol, discoveredSlots: DiscoveredMurmurSlots): ResolvedConfigurationSlot {
  if (symbol === 'O') {
    return {
      symbol,
      label: 'Oull',
      modId: 'oull',
      isPlaceholder: false,
      isRandomResolvedToC: false,
    };
  }

  if (symbol === 'R') {
    const cMurmur = discoveredSlots[2];
    if (cMurmur) {
      return {
        symbol,
        label: 'R -> C',
        modId: cMurmur,
        isPlaceholder: false,
        isRandomResolvedToC: true,
      };
    }

    return {
      symbol,
      label: 'R (random)',
      modId: null,
      isPlaceholder: true,
      isRandomResolvedToC: false,
    };
  }

  const slotIndexBySymbol: Record<'A' | 'B' | 'C', number> = {
    A: 0,
    B: 1,
    C: 2,
  };

  const slotValue = discoveredSlots[slotIndexBySymbol[symbol]];
  if (!slotValue) {
    return {
      symbol,
      label: `${symbol} (unknown)`,
      modId: null,
      isPlaceholder: true,
      isRandomResolvedToC: false,
    };
  }

  return {
    symbol,
    label: symbol,
    modId: slotValue,
    isPlaceholder: false,
    isRandomResolvedToC: false,
  };
}

function isOull(modId: RequiemModId): boolean {
  return modId === 'oull';
}

export function useLichSolver() {
  const [discoveredSlots, setDiscoveredSlots] = usePersistentState<DiscoveredMurmurSlots>(
    STORAGE_KEYS.lichDiscoveredMurmurSlots,
    [...DEFAULT_DISCOVERED_MURMUR_SLOTS] as DiscoveredMurmurSlots,
    parseDiscoveredMurmurSlots,
    serializeDiscoveredMurmurSlots,
  );
  const [stateId, setStateId] = usePersistentState<LichSolverStateId>(
    STORAGE_KEYS.lichSolverStateId,
    'ORR',
    parseSolverStateId,
    (value) => value,
  );
  const [attemptCount, setAttemptCount] = usePersistentState<number>(
    STORAGE_KEYS.lichSolverAttemptCount,
    0,
    parseAttemptCount,
    (value) => String(value),
  );
  const [history, setHistory] = usePersistentState<LichDecisionLog[]>(
    STORAGE_KEYS.lichSolverHistory,
    [],
    parseHistory,
    serializeHistory,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const stateDefinition = STATE_DEFINITIONS[stateId];

  useEffect(() => {
    if (!discoveredSlots[0] && stateId !== 'ORR') {
      setStateId('ORR');
    }
  }, [discoveredSlots, setStateId, stateId]);

  const configurationSlots = useMemo(() => {
    if (!stateDefinition.configuration) {
      return [];
    }

    return stateDefinition.configuration.map((symbol) => resolveSymbol(symbol, discoveredSlots));
  }, [discoveredSlots, stateDefinition.configuration]);

  const assignDiscoveredSlot = useCallback((slotIndex: 0 | 1 | 2, modId: RequiemModId): boolean => {
    if (isOull(modId)) {
      setNotice('Oull is a universal wildcard and cannot be stored as murmur A/B/C.');
      return false;
    }

    setDiscoveredSlots((previousSlots) => {
      const nextSlots: DiscoveredMurmurSlots = [...previousSlots] as DiscoveredMurmurSlots;
      const duplicateIndex = nextSlots.findIndex((value) => value === modId);
      if (duplicateIndex >= 0) {
        nextSlots[duplicateIndex as 0 | 1 | 2] = null;
      }

      nextSlots[slotIndex] = modId;
      return nextSlots;
    });

    setNotice(null);
    return true;
  }, [setDiscoveredSlots]);

  const clearDiscoveredSlot = useCallback((slotIndex: 0 | 1 | 2) => {
    setDiscoveredSlots((previousSlots) => {
      const nextSlots: DiscoveredMurmurSlots = [...previousSlots] as DiscoveredMurmurSlots;
      nextSlots[slotIndex] = null;
      return nextSlots;
    });

    if (slotIndex === 0 && stateId !== 'ORR') {
      setStateId('ORR');
      setNotice('Murmur A is required to continue. Returned to node O/R/R.');
    }
  }, [setDiscoveredSlots, setStateId, setNotice, stateId]);

  const addNextDiscoveredMurmur = useCallback((modId: RequiemModId): boolean => {
    if (isOull(modId)) {
      setNotice('Oull should not be placed in discovered murmurs.');
      return false;
    }

    const firstEmpty = discoveredSlots.findIndex((value) => value === null);
    if (firstEmpty < 0) {
      setNotice('Slots A/B/C are already filled.');
      return false;
    }

    return assignDiscoveredSlot(firstEmpty as 0 | 1 | 2, modId);
  }, [assignDiscoveredSlot, discoveredSlots]);

  const resetMachine = useCallback(() => {
    setStateId('ORR');
    setAttemptCount(0);
    setHistory([]);
    setNotice(null);
  }, [setAttemptCount, setHistory, setStateId]);

  const clearAll = useCallback(() => {
    setDiscoveredSlots([...DEFAULT_DISCOVERED_MURMUR_SLOTS] as DiscoveredMurmurSlots);
    setStateId('ORR');
    setAttemptCount(0);
    setHistory([]);
    setNotice(null);
  }, [setAttemptCount, setDiscoveredSlots, setHistory, setStateId]);

  const undoLastFeedback = useCallback((): boolean => {
    if (history.length === 0) {
      setNotice('No feedback to undo.');
      return false;
    }

    const previousHistory = history.slice(0, -1);
    const lastEntry = history[history.length - 1];
    const previousAttemptCount = previousHistory.length > 0
      ? previousHistory[previousHistory.length - 1].attemptCount
      : 0;

    setHistory(previousHistory);
    setStateId(lastEntry.fromStateId);
    setAttemptCount(previousAttemptCount);
    setNotice(null);
    return true;
  }, [history, setAttemptCount, setHistory, setNotice, setStateId]);

  const applyFeedback = useCallback((optionId: string): boolean => {
    const option = stateDefinition.feedbackOptions.find((entry) => entry.id === optionId);
    if (!option) {
      return false;
    }

    if (stateId === 'SOLVED' && option.id === 'solved-restart') {
      clearAll();
      return true;
    }

    if (option.requiresKnownA && !discoveredSlots[0]) {
      setNotice(option.messageOnBlocked ?? 'Action not possible: murmur A is missing.');
      return false;
    }

    const nextAttemptCount = option.consumesAttempt ? attemptCount + 1 : attemptCount;
    if (option.consumesAttempt) {
      setAttemptCount(nextAttemptCount);
    }

    const logEntry: LichDecisionLog = {
      timestamp: Date.now(),
      fromStateId: stateId,
      toStateId: option.nextStateId,
      optionId: option.id,
      optionLabel: option.label,
      attemptCount: nextAttemptCount,
    };
    setHistory((previous) => [...previous, logEntry].slice(-MAX_HISTORY_ENTRIES));

    if (option.nextStateId === null) {
      setNotice(option.messageOnDeadEnd ?? 'This branch does not provide any further transition.');
      return false;
    }

    setStateId(option.nextStateId);
    setNotice(null);
    return true;
  }, [attemptCount, clearAll, discoveredSlots, setAttemptCount, setHistory, setStateId, stateDefinition.feedbackOptions, stateId]);

  return {
    discoveredSlots,
    stateId,
    stateDefinition,
    stateDefinitions: STATE_DEFINITIONS,
    configurationSlots,
    attemptCount,
    history,
    canUndo: history.length > 0,
    notice,
    setNotice,
    assignDiscoveredSlot,
    clearDiscoveredSlot,
    addNextDiscoveredMurmur,
    applyFeedback,
    resetMachine,
    clearAll,
    undoLastFeedback,
  };
}
