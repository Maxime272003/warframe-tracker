import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import type { Engine } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import voltSkin from '../../assets/VoltRaijinSkin.png';
import revenantSkin from '../../assets/RevenantMephistoSkin.png';
import type { ItemFilter } from './types';
import { STORAGE_KEYS, ITEM_FILTER_OPTIONS } from './constants';
import { CategorySection } from './components/CategorySection';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { filterItemNames, getRemainingObtainableItemCount, normalizeCategoryKey, parseImportJson } from './utils';
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

export default function ArsenalTracker() {
  const [itemsCatalog, isLoading, categories] = useItemsCatalog();
  const [selectedCategory, setSelectedCategory] = usePersistentState<string>(STORAGE_KEYS.selectedCategory, 'All', (raw) => raw, (value) => value);
  const [hideOwned, setHideOwned] = usePersistentState<boolean>(STORAGE_KEYS.hideOwned, false, parseBoolean, serializeBoolean);
  const [hideUnobtainable, setHideUnobtainable] = usePersistentState<boolean>(STORAGE_KEYS.hideUnobtainable, false, parseBoolean, serializeBoolean);
  const [filter, setFilter] = usePersistentState<ItemFilter>(STORAGE_KEYS.filter, 'All', parseItemFilter, serializeItemFilter);
  const [ownedItems, setOwnedItems] = usePersistentState<Set<string>>(STORAGE_KEYS.ownedItems, new Set<string>(), parseSet, serializeSet);
  const [unobtainableItems, setUnobtainableItems] = usePersistentState<Set<string>>(STORAGE_KEYS.unobtainableItems, new Set<string>(), parseSet, serializeSet);
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
          alert('Invalid JSON format.');
          return;
        }

        // Build owned set: everything in the catalog that is NOT in the imported remaining list
        const newOwnedItems = new Set<string>();
        for (const category of categories) {
          const allItemsInCategory = itemsCatalog[category] ?? [];
          const remainingInCategory = new Set(remainingCatalog[normalizeCategoryKey(category)] ?? []);

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
  }, [itemsCatalog, categories, setOwnedItems]);

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

  const toggleUnobtainable = useCallback((item: string) => {
    setUnobtainableItems((previousUnobtainableItems) => {
      const nextUnobtainableItems = new Set(previousUnobtainableItems);

      if (nextUnobtainableItems.has(item)) {
        nextUnobtainableItems.delete(item);
      } else {
        nextUnobtainableItems.add(item);
      }

      return nextUnobtainableItems;
    });
  }, [setUnobtainableItems]);

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
    const result: Record<string, string[]> = {};
    for (const category of categories) {
      let items = filterItemNames(itemsCatalog[category] ?? [], filter);
      if (searchLower) {
        items = items.filter((item) => item.toLowerCase().includes(searchLower));
      }
      result[category] = items;
    }
    return result;
  }, [itemsCatalog, categories, filter, searchLower]);

  const totalRemaining = useMemo(() => {
    let total = 0;
    for (const category of categories) {
      total += getRemainingObtainableItemCount(filteredByCategory[category] ?? [], ownedItems, unobtainableItems);
    }
    return total;
  }, [filteredByCategory, categories, ownedItems, unobtainableItems]);

  // Priority items across all categories
  const priorityFiltered = useMemo(() => {
    const allFilteredItems = categories.flatMap((category) => filteredByCategory[category] ?? []);
    return allFilteredItems.filter(
      (item) => priorityItems.has(item)
        && (!hideOwned || !ownedItems.has(item))
        && (!hideUnobtainable || !unobtainableItems.has(item)),
    );
  }, [filteredByCategory, categories, priorityItems, hideOwned, ownedItems, hideUnobtainable, unobtainableItems]);

  const exportRemainingJson = useCallback(() => {
    const remaining: Record<string, string[]> = {};

    for (const category of categories) {
      const key = category.toLowerCase().replace(/[\s-]/g, '_');
      remaining[key] = (itemsCatalog[category] ?? []).filter((item) => !ownedItems.has(item));
    }

    const blob = new Blob([JSON.stringify(remaining, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'remaining_items.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [itemsCatalog, categories, ownedItems]);

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

  const categoriesWithStatus = useMemo(() => {
    return categories.map(category => {
      const allItemsInCategory = filteredByCategory[category] ?? [];
      const visibleItemsInCategory = allItemsInCategory.filter((item) => {
        if (hideOwned && ownedItems.has(item)) {
          return false;
        }

        if (hideUnobtainable && unobtainableItems.has(item)) {
          return false;
        }

        return true;
      });

      const displayedItemsCount = visibleItemsInCategory.length;
      const remainingCount = allItemsInCategory.filter((item) => !ownedItems.has(item) && !unobtainableItems.has(item)).length;
      
      return { 
        category, 
        remainingCount, 
        displayedItemsCount,
        hasMatches: allItemsInCategory.length > 0
      };
    });
  }, [categories, filteredByCategory, ownedItems, hideOwned, hideUnobtainable, unobtainableItems]);

  const visibleCategories = useMemo(() => {
    return categoriesWithStatus
      .filter(status => {
        if (status.displayedItemsCount === 0) return false;

        if (selectedCategory !== 'All' && status.category !== selectedCategory) return false;

        return true;
      })
      .map(status => status.category);
  }, [categoriesWithStatus, selectedCategory]);

  const navCategories = useMemo(() => {
    return categoriesWithStatus
      .filter(status => status.displayedItemsCount > 0)
      .map(status => status.category);
  }, [categoriesWithStatus]);

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
          <button 
            className={`nav-link ${selectedCategory === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('All')}
          >
            All
          </button>
          {navCategories.map((category) => (
            <button 
              key={category} 
              className={`nav-link ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
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

          <label className="switch-container">
            <span className="switch-label">Hide unobtainable</span>
            <input checked={hideUnobtainable} onChange={() => setHideUnobtainable((currentValue) => !currentValue)} type="checkbox" />
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
        {priorityFiltered.length > 0 && (selectedCategory === 'All' || priorityFiltered.some(item => {
           // We can check if any filtered items in the selected category are priorities
           return visibleCategories.some(cat => (selectedCategory === 'All' || cat === selectedCategory) && filteredByCategory[cat]?.some(i => i === item));
        })) && (
          <CategorySection
            id="priorities"
            title="Priorities"
            category="Priorities"
            items={priorityFiltered}
            ownedItems={ownedItems}
            priorityItems={priorityItems}
            unobtainableItems={unobtainableItems}
            hideOwned={hideOwned}
            hideUnobtainable={hideUnobtainable}
            marketSlugs={marketSlugs}
            onToggleOwned={toggleItem}
            onTogglePriority={togglePriority}
            onToggleUnobtainable={toggleUnobtainable}
          />
        )}

        {visibleCategories.map((category) => (
          <CategorySection
            key={category}
            id={category.toLowerCase().replace(/[\s-]/g, '_')}
            title={category}
            category={category}
            items={(filteredByCategory[category] ?? []).filter((item) => !priorityItems.has(item))}
            ownedItems={ownedItems}
            priorityItems={priorityItems}
            unobtainableItems={unobtainableItems}
            hideOwned={hideOwned}
            hideUnobtainable={hideUnobtainable}
            marketSlugs={marketSlugs}
            onToggleOwned={toggleItem}
            onTogglePriority={togglePriority}
            onToggleUnobtainable={toggleUnobtainable}
          />
        ))}
      </main>

      <img src={voltSkin} alt="Volt Raijin" className="decoration-skin left-skin" />
      <img src={revenantSkin} alt="Revenant Mephisto" className="decoration-skin right-skin" />

      <ScrollToTopButton />
    </div>
  );
}