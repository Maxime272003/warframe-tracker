export type ItemCatalog = Record<string, string[]>;

export type ItemFilter = 'All' | 'Standard' | 'Prime' | 'Kuva' | 'Tenet' | 'Coda';

export type ManualCatalogItem = {
	category: string;
	name: string;
};