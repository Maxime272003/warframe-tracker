export type ItemCatalog = Record<string, string[]>;

export type ItemFilter = 'All' | 'Standard' | 'Prime' | 'Kuva' | 'Tenet' | 'Coda';

export type ManualCatalogItem = {
	category: string;
	name: string;
};

export type RequiemModId =
	| 'fass'
	| 'khra'
	| 'jahu'
	| 'netra'
	| 'lohk'
	| 'ris'
	| 'vome'
	| 'xata'
	| 'oull';

export type RequiemSymbol = 'O' | 'A' | 'B' | 'C' | 'R';

export type LichSolverView = 'arsenal' | 'solver';

export type LichSolverStateId =
	| 'ORR'
	| 'OAR'
	| 'AOB'
	| 'OAB'
	| 'BCA'
	| 'ABC'
	| 'ACB'
	| 'BAC'
	| 'CAB'
	| 'CBA'
	| 'SOLVED';

export type DiscoveredMurmurSlots = [RequiemModId | null, RequiemModId | null, RequiemModId | null];

export type LichFeedbackOption = {
	id: string;
	label: string;
	nextStateId: LichSolverStateId | null;
	consumesAttempt: boolean;
	style: 'neutral' | 'success' | 'danger';
	requiresKnownA?: boolean;
	messageOnBlocked?: string;
	messageOnDeadEnd?: string;
};

export type LichStateDefinition = {
	id: LichSolverStateId;
	title: string;
	description: string;
	configuration: [RequiemSymbol, RequiemSymbol, RequiemSymbol] | null;
	feedbackOptions: LichFeedbackOption[];
	isFinalSuggestion?: boolean;
};

export type LichDecisionLog = {
	timestamp: number;
	fromStateId: LichSolverStateId;
	toStateId: LichSolverStateId | null;
	optionId: string;
	optionLabel: string;
	attemptCount: number;
};