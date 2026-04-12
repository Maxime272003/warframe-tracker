export type WeaponCatalog = {
  warframe_weapons: {
    melee: string[];
    primary: string[];
    secondary: string[];
    [key: string]: string[] | undefined;
  };
};

export type WeaponFilter = 'All' | 'Standard' | 'Kuva' | 'Tenet' | 'Coda';

export const EMPTY_WEAPON_CATALOG: WeaponCatalog = {
  warframe_weapons: {
    primary: [],
    secondary: [],
    melee: [],
  },
};