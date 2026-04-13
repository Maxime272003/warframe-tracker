export type DisplayCategory = 'Warframes' | 'Primary' | 'Secondary' | 'Melee' | 'Archwings' | 'Companions';

export type ItemCatalog = Record<DisplayCategory, string[]>;

export type ItemFilter = 'All' | 'Standard' | 'Prime' | 'Kuva' | 'Tenet' | 'Coda';

export const EMPTY_ITEM_CATALOG: ItemCatalog = {
  Warframes: [],
  Primary: [],
  Secondary: [],
  Melee: [],
  Archwings: [],
  Companions: [],
};