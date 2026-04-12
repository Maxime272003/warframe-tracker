import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import type { Engine } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import voltSkin from '../../assets/VoltRaijinSkin.png';
import revenantSkin from '../../assets/RevenantMephistoSkin.png';
import { EMPTY_WEAPON_CATALOG, type WeaponCatalog, type WeaponFilter } from './types';
import { STORAGE_KEYS, WEAPON_FILTER_OPTIONS } from './constants';
import { CategorySection } from './components/CategorySection';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { filterWeaponNames, getRemainingWeaponCount } from './utils';
import { useMarketSlugs } from './hooks/useMarketSlugs';
import { usePersistentState } from './hooks/usePersistentState';
import { useWeaponsCatalog } from './hooks/useWeaponsCatalog';

const parseBoolean = (raw: string): boolean => raw === 'true';
const serializeBoolean = (value: boolean): string => String(value);
const parseWeaponFilter = (raw: string): WeaponFilter => {
  return WEAPON_FILTER_OPTIONS.some((option) => option.value === raw) ? (raw as WeaponFilter) : 'All';
};
const serializeWeaponFilter = (value: WeaponFilter): string => value;
const parseSet = (raw: string): Set<string> => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
};
const serializeSet = (value: Set<string>): string => JSON.stringify(Array.from(value));

export default function ArsenalTracker() {
  const [weaponsCatalog, setWeaponsCatalog] = useWeaponsCatalog(EMPTY_WEAPON_CATALOG);
  const [hideOwned, setHideOwned] = usePersistentState<boolean>(STORAGE_KEYS.hideOwned, false, parseBoolean, serializeBoolean);
  const [filter, setFilter] = usePersistentState<WeaponFilter>(STORAGE_KEYS.filter, 'All', parseWeaponFilter, serializeWeaponFilter);
  const [ownedWeapons, setOwnedWeapons] = usePersistentState<Set<string>>(STORAGE_KEYS.ownedWeapons, new Set<string>(), parseSet, serializeSet);
  const [priorityWeapons, setPriorityWeapons] = usePersistentState<Set<string>>(STORAGE_KEYS.priorityWeapons, new Set<string>(), parseSet, serializeSet);
  const marketSlugs = useMarketSlugs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [particlesReady, setParticlesReady] = useState(false);

  useEffect(() => {
    void initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => setParticlesReady(true));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const parsed = JSON.parse(String(loadEvent.target?.result ?? '')) as unknown;
        if (parsed && typeof parsed === 'object' && 'warframe_weapons' in parsed) {
          setWeaponsCatalog(parsed as WeaponCatalog);
          alert('Liste des armes importée avec succès !');
        } else {
          alert("Le fichier JSON n'a pas le bon format.");
        }
      } catch {
        alert('Erreur de lecture du fichier JSON.');
      }
    };

    reader.readAsText(file);
    event.currentTarget.value = '';
  };

  const toggleWeapon = (weapon: string) => {
    setOwnedWeapons((previousOwnedWeapons) => {
      const nextOwnedWeapons = new Set(previousOwnedWeapons);

      if (nextOwnedWeapons.has(weapon)) {
        nextOwnedWeapons.delete(weapon);
        return nextOwnedWeapons;
      }

      nextOwnedWeapons.add(weapon);
      setPriorityWeapons((previousPriorityWeapons) => {
        const nextPriorityWeapons = new Set(previousPriorityWeapons);
        nextPriorityWeapons.delete(weapon);
        return nextPriorityWeapons;
      });

      return nextOwnedWeapons;
    });
  };

  const togglePriority = (weapon: string) => {
    setPriorityWeapons((previousPriorityWeapons) => {
      const nextPriorityWeapons = new Set(previousPriorityWeapons);

      if (nextPriorityWeapons.has(weapon)) {
        nextPriorityWeapons.delete(weapon);
      } else {
        nextPriorityWeapons.add(weapon);
      }

      return nextPriorityWeapons;
    });
  };

  const weaponGroups = weaponsCatalog.warframe_weapons;
  const filteredPrimary = filterWeaponNames(weaponGroups.primary ?? [], filter);
  const filteredSecondary = filterWeaponNames(weaponGroups.secondary ?? [], filter);
  const filteredMelee = filterWeaponNames(weaponGroups.melee ?? [], filter);
  const allFilteredWeapons = [...filteredPrimary, ...filteredSecondary, ...filteredMelee];
  const priorityFiltered = allFilteredWeapons.filter((weapon) => priorityWeapons.has(weapon) && (!hideOwned || !ownedWeapons.has(weapon)));
  const remainingToFarm = getRemainingWeaponCount(allFilteredWeapons, ownedWeapons);

  const exportRemainingJson = () => {
    const remaining = {
      warframe_weapons: {
        primary: weaponsCatalog.warframe_weapons.primary.filter((weapon) => !ownedWeapons.has(weapon)),
        secondary: weaponsCatalog.warframe_weapons.secondary.filter((weapon) => !ownedWeapons.has(weapon)),
        melee: weaponsCatalog.warframe_weapons.melee.filter((weapon) => !ownedWeapons.has(weapon)),
      },
    };

    const blob = new Blob([JSON.stringify(remaining, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'remaining_weapons.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {particlesReady && (
        <Particles
          id="tsparticles"
          options={{
            fullScreen: { enable: true, zIndex: -1 },
            background: { color: { value: 'transparent' } },
            fpsLimit: 60,
            interactivity: {
              events: { onHover: { enable: true, mode: 'grab' } },
              modes: {
                grab: {
                  distance: 200,
                  links: { opacity: 0.5, color: '#e2c076' },
                },
              },
            },
            particles: {
              color: { value: '#e2c076' },
              links: {
                color: '#e2c076',
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
              },
              move: {
                direction: 'none',
                enable: true,
                outModes: { default: 'bounce' },
                random: true,
                speed: 1,
                straight: false,
              },
              number: {
                density: { enable: true, width: 800 },
                value: 80,
              },
              opacity: { value: 0.3 },
              shape: { type: 'circle' },
              size: { value: { min: 1, max: 3 } },
            },
            detectRetina: true,
          }}
        />
      )}

      <header className="header">
        <h1 className="title">Warframe Arsenal</h1>
      </header>

      <div className="pre-sticky-actions">
        <button className="export-btn" onClick={exportRemainingJson} type="button">
          Exporter Restants
        </button>

        <button className="upload-btn" onClick={() => fileInputRef.current?.click()} type="button">
          Importer JSON
        </button>
        <input accept=".json" className="file-input" onChange={handleFileUpload} ref={fileInputRef} type="file" />
      </div>

      <div className="controls">
        <div className="top-nav">
          <a href="#primary" className="nav-link">Principales</a>
          <a href="#secondary" className="nav-link">Secondaires</a>
          <a href="#melee" className="nav-link">Mêlée</a>
        </div>

        <div className="summary-stats">
          {remainingToFarm} arme(s) {filter !== 'All' ? `(${filter.toLowerCase()}) ` : ''}restante(s) à farm
        </div>

        <div className="controls-inline">
          <select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value as WeaponFilter)}>
            {WEAPON_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <label className="switch-container">
            <span className="switch-label">Masquer acquises</span>
            <input checked={hideOwned} onChange={() => setHideOwned((currentValue) => !currentValue)} type="checkbox" />
          </label>
        </div>
      </div>

      <main>
        {priorityFiltered.length > 0 && (
          <CategorySection
            id="priority"
            title="Priorités"
            weapons={priorityFiltered}
            ownedWeapons={ownedWeapons}
            priorityWeapons={priorityWeapons}
            hideOwned={hideOwned}
            marketSlugs={marketSlugs}
            onToggleOwned={toggleWeapon}
            onTogglePriority={togglePriority}
          />
        )}

        <CategorySection
          id="primary"
          title="Armes Principales"
          weapons={filteredPrimary.filter((weapon) => !priorityWeapons.has(weapon))}
          ownedWeapons={ownedWeapons}
          priorityWeapons={priorityWeapons}
          hideOwned={hideOwned}
          marketSlugs={marketSlugs}
          onToggleOwned={toggleWeapon}
          onTogglePriority={togglePriority}
        />

        <CategorySection
          id="secondary"
          title="Armes Secondaires"
          weapons={filteredSecondary.filter((weapon) => !priorityWeapons.has(weapon))}
          ownedWeapons={ownedWeapons}
          priorityWeapons={priorityWeapons}
          hideOwned={hideOwned}
          marketSlugs={marketSlugs}
          onToggleOwned={toggleWeapon}
          onTogglePriority={togglePriority}
        />

        <CategorySection
          id="melee"
          title="Armes de Mêlée"
          weapons={filteredMelee.filter((weapon) => !priorityWeapons.has(weapon))}
          ownedWeapons={ownedWeapons}
          priorityWeapons={priorityWeapons}
          hideOwned={hideOwned}
          marketSlugs={marketSlugs}
          onToggleOwned={toggleWeapon}
          onTogglePriority={togglePriority}
        />
      </main>

      <img src={voltSkin} alt="Volt Raijin" className="decoration-skin left-skin" />
      <img src={revenantSkin} alt="Revenant Mephisto" className="decoration-skin right-skin" />

      <ScrollToTopButton />
    </div>
  );
}