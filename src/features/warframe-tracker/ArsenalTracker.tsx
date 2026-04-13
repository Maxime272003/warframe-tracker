import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import type { Engine } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import voltSkin from '../../assets/VoltRaijinSkin.png';
import revenantSkin from '../../assets/RevenantMephistoSkin.png';
import type { DisplayCategory, ItemFilter } from './types';
import { STORAGE_KEYS, ITEM_FILTER_OPTIONS, DISPLAY_CATEGORIES } from './constants';
import { CategorySection } from './components/CategorySection';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { filterItemNames, getRemainingItemCount, parseImportJson } from './utils';
import { useMarketSlugs } from './hooks/useMarketSlugs';
import { usePersistentState } from './hooks/usePersistentState';
import { useItemsCatalog } from './hooks/useItemsCatalog';

const parseBoolean = (raw: string): boolean => raw === 'true';
const serializeBoolean = (value: boolean): string => String(value);
const parseItemFilter = (raw: string): ItemFilter => {
  return ITEM_FILTER_OPTIONS.some((option) => option.value === raw) ? (raw as ItemFilter) : 'All';
};
const serializeItemFilter = (value: ItemFilter): string => value;
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

const CATEGORY_JSON_KEYS: Record<DisplayCategory, string> = {
  Warframes: 'warframes',
  Primary: 'primary',
  Secondary: 'secondary',
  Melee: 'melee',
  Archwings: 'archwings',
  Companions: 'companions',
};

export default function ArsenalTracker() {
  const [itemsCatalog, isLoading] = useItemsCatalog();
  const [hideOwned, setHideOwned] = usePersistentState<boolean>(STORAGE_KEYS.hideOwned, false, parseBoolean, serializeBoolean);
  const [filter, setFilter] = usePersistentState<ItemFilter>(STORAGE_KEYS.filter, 'All', parseItemFilter, serializeItemFilter);
  const [ownedItems, setOwnedItems] = usePersistentState<Set<string>>(STORAGE_KEYS.ownedItems, new Set<string>(), parseSet, serializeSet);
  const [priorityItems, setPriorityItems] = usePersistentState<Set<string>>(STORAGE_KEYS.priorityItems, new Set<string>(), parseSet, serializeSet);
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const parsed = JSON.parse(String(loadEvent.target?.result ?? '')) as unknown;
        const remainingCatalog = parseImportJson(parsed);

        if (!remainingCatalog) {
          alert('Invalid JSON format. Expected keys: warframes, primary, secondary, melee, archwings, companions.');
          return;
        }

        // Build owned set: everything in the catalog that is NOT in the imported remaining list
        const newOwnedItems = new Set<string>();
        for (const category of DISPLAY_CATEGORIES) {
          const allItemsInCategory = itemsCatalog[category];
          const remainingInCategory = new Set(remainingCatalog[category]);

          for (const item of allItemsInCategory) {
            if (!remainingInCategory.has(item)) {
              newOwnedItems.add(item);
            }
          }
        }

        setOwnedItems(newOwnedItems);
        alert(`Import successful! ${newOwnedItems.size} items marked as owned.`);
      } catch {
        alert('Error reading JSON file.');
      }
    };

    reader.readAsText(file);
    event.currentTarget.value = '';
  }, [itemsCatalog, setOwnedItems]);

  const toggleItem = useCallback((item: string) => {
    setOwnedItems((previousOwnedItems) => {
      const nextOwnedItems = new Set(previousOwnedItems);

      if (nextOwnedItems.has(item)) {
        nextOwnedItems.delete(item);
        return nextOwnedItems;
      }

      nextOwnedItems.add(item);
      setPriorityItems((previousPriorityItems) => {
        const nextPriorityItems = new Set(previousPriorityItems);
        nextPriorityItems.delete(item);
        return nextPriorityItems;
      });

      return nextOwnedItems;
    });
  }, [setOwnedItems, setPriorityItems]);

  const togglePriority = useCallback((item: string) => {
    setPriorityItems((previousPriorityItems) => {
      const nextPriorityItems = new Set(previousPriorityItems);

      if (nextPriorityItems.has(item)) {
        nextPriorityItems.delete(item);
      } else {
        nextPriorityItems.add(item);
      }

      return nextPriorityItems;
    });
  }, [setPriorityItems]);

  // Memoize filtered items per category
  const searchLower = searchQuery.toLowerCase().trim();

  const filteredByCategory = useMemo(() => {
    const result: Record<DisplayCategory, string[]> = {} as Record<DisplayCategory, string[]>;
    for (const category of DISPLAY_CATEGORIES) {
      let items = filterItemNames(itemsCatalog[category], filter);
      if (searchLower) {
        items = items.filter((item) => item.toLowerCase().includes(searchLower));
      }
      result[category] = items;
    }
    return result;
  }, [itemsCatalog, filter, searchLower]);

  const totalRemaining = useMemo(() => {
    let total = 0;
    for (const category of DISPLAY_CATEGORIES) {
      total += getRemainingItemCount(filteredByCategory[category], ownedItems);
    }
    return total;
  }, [filteredByCategory, ownedItems]);

  // Priority items across all categories
  const priorityFiltered = useMemo(() => {
    const allFilteredItems = DISPLAY_CATEGORIES.flatMap((category) => filteredByCategory[category]);
    return allFilteredItems.filter(
      (item) => priorityItems.has(item) && (!hideOwned || !ownedItems.has(item)),
    );
  }, [filteredByCategory, priorityItems, hideOwned, ownedItems]);

  const exportRemainingJson = useCallback(() => {
    const remaining: Record<string, string[]> = {};

    for (const category of DISPLAY_CATEGORIES) {
      const key = CATEGORY_JSON_KEYS[category];
      remaining[key] = itemsCatalog[category].filter((item) => !ownedItems.has(item));
    }

    const blob = new Blob([JSON.stringify(remaining, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'remaining_items.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [itemsCatalog, ownedItems]);

  const particlesOptions = useMemo(() => ({
    fullScreen: { enable: true, zIndex: -1 },
    background: { color: { value: 'transparent' } },
    fpsLimit: 60,
    interactivity: {
      events: { onHover: { enable: true, mode: 'grab' as const } },
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
        direction: 'none' as const,
        enable: true,
        outModes: { default: 'bounce' as const },
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
  }), []);

  return (
    <div className="app-container">
      {particlesReady && (
        <Particles id="tsparticles" options={particlesOptions} />
      )}

      <header className="header">
        <h1 className="title">Warframe Arsenal</h1>
      </header>

      <div className="pre-sticky-actions">
        <button className="export-btn" onClick={exportRemainingJson} type="button">
          Export Remaining
        </button>

        <button className="upload-btn" onClick={() => fileInputRef.current?.click()} type="button">
          Import JSON
        </button>
        <input accept=".json" className="file-input" onChange={handleFileUpload} ref={fileInputRef} type="file" />
      </div>

      <div className="controls">
        <div className="top-nav">
          {DISPLAY_CATEGORIES.map((category) => (
            <a key={category} href={`#${category.toLowerCase()}`} className="nav-link">
              {category}
            </a>
          ))}
        </div>

        <div className="summary-stats">
          {isLoading ? 'Loading items...' : `${totalRemaining} item(s) remaining`}
        </div>

        <div className="controls-inline">
          <input
            type="text"
            className="search-bar"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value as ItemFilter)}>
            {ITEM_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <label className="switch-container">
            <span className="switch-label">Hide owned</span>
            <input checked={hideOwned} onChange={() => setHideOwned((currentValue) => !currentValue)} type="checkbox" />
          </label>
        </div>
      </div>

      {isLoading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Fetching items from Warframe API...</p>
        </div>
      )}

      <main>
        {priorityFiltered.length > 0 && (
          <CategorySection
            id="priorities"
            title="Priorities"
            category="Priorities"
            items={priorityFiltered}
            ownedItems={ownedItems}
            priorityItems={priorityItems}
            hideOwned={hideOwned}
            marketSlugs={marketSlugs}
            onToggleOwned={toggleItem}
            onTogglePriority={togglePriority}
          />
        )}

        {DISPLAY_CATEGORIES.map((category) => (
          <CategorySection
            key={category}
            id={category.toLowerCase()}
            title={category}
            category={category}
            items={filteredByCategory[category].filter((item) => !priorityItems.has(item))}
            ownedItems={ownedItems}
            priorityItems={priorityItems}
            hideOwned={hideOwned}
            marketSlugs={marketSlugs}
            onToggleOwned={toggleItem}
            onTogglePriority={togglePriority}
          />
        ))}
      </main>

      <img src={voltSkin} alt="Volt Raijin" className="decoration-skin left-skin" />
      <img src={revenantSkin} alt="Revenant Mephisto" className="decoration-skin right-skin" />

      <ScrollToTopButton />
    </div>
  );
}