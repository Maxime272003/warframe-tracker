import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import type { Engine } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import type { ItemFilter, LichSolverView } from './types';
import { STORAGE_KEYS, ITEM_FILTER_OPTIONS } from './constants';
import { CategorySection } from './components/CategorySection';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { WorldStatePanel } from './components/WorldStatePanel';
import { FissuresPanel } from './components/FissuresPanel';
import { LichSolverPage } from './components/LichSolverPage';
import { filterItemNames, getRemainingObtainableItemCount, normalizeCategoryKey, parseImportJson } from './utils';
import { useMarketSlugs } from './hooks/useMarketSlugs';
import { usePersistentState } from './hooks/usePersistentState';
import { useItemsCatalog } from './hooks/useItemsCatalog';
import { useWorldState } from './hooks/useWorldState';

const parseBoolean = (raw: string): boolean => raw === 'true';
const serializeBoolean = (value: boolean): string => String(value);
const parseItemFilter = (raw: string): ItemFilter => {
  return ITEM_FILTER_OPTIONS.some((option) => option.value === raw) ? (raw as ItemFilter) : 'All';
};
const serializeItemFilter = (value: ItemFilter): string => value;
const parseActiveView = (raw: string): LichSolverView => (raw === 'solver' ? 'solver' : 'arsenal');
const serializeActiveView = (value: LichSolverView): string => value;
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
  const [showFiltersBar, setShowFiltersBar] = usePersistentState<boolean>(STORAGE_KEYS.showFiltersBar, true, parseBoolean, serializeBoolean);
  const [activeView, setActiveView] = usePersistentState<LichSolverView>(STORAGE_KEYS.activeView, 'arsenal', parseActiveView, serializeActiveView);
  const [filter, setFilter] = usePersistentState<ItemFilter>(STORAGE_KEYS.filter, 'All', parseItemFilter, serializeItemFilter);
  const [ownedItems, setOwnedItems] = usePersistentState<Set<string>>(STORAGE_KEYS.ownedItems, new Set<string>(), parseSet, serializeSet);
  const [unobtainableItems, setUnobtainableItems] = usePersistentState<Set<string>>(STORAGE_KEYS.unobtainableItems, new Set<string>(), parseSet, serializeSet);
  const [priorityItems, setPriorityItems] = usePersistentState<Set<string>>(STORAGE_KEYS.priorityItems, new Set<string>(), parseSet, serializeSet);
  const [searchQuery, setSearchQuery] = useState('');
  const marketSlugs = useMarketSlugs();
  const { worldState, isLoading: isWorldStateLoading, refresh: refreshWorldState } = useWorldState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const [particlesReady, setParticlesReady] = useState(false);
  const [isUiTransitioning, setIsUiTransitioning] = useState(false);

  useEffect(() => {
    void initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => setParticlesReady(true));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const triggerUiTransition = useCallback(() => {
    setIsUiTransitioning(true);
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsUiTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 320);
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

  const handleCategorySelect = useCallback((category: string) => {
    triggerUiTransition();
    setSelectedCategory(category);
  }, [setSelectedCategory, triggerUiTransition]);

  const handleFilterChange = useCallback((nextFilter: ItemFilter) => {
    triggerUiTransition();
    setFilter(nextFilter);
  }, [setFilter, triggerUiTransition]);

  const handleToggleHideOwned = useCallback(() => {
    triggerUiTransition();
    setHideOwned((currentValue) => !currentValue);
  }, [setHideOwned, triggerUiTransition]);

  const handleToggleHideUnobtainable = useCallback(() => {
    triggerUiTransition();
    setHideUnobtainable((currentValue) => !currentValue);
  }, [setHideUnobtainable, triggerUiTransition]);

  const handleToggleView = useCallback(() => {
    setActiveView((previousView) => (previousView === 'arsenal' ? 'solver' : 'arsenal'));
  }, [setActiveView]);

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

  const shouldRenderPriorities = useMemo(() => {
    if (priorityFiltered.length === 0) {
      return false;
    }

    if (selectedCategory === 'All') {
      return true;
    }

    const selectedItems = filteredByCategory[selectedCategory] ?? [];
    return priorityFiltered.some((item) => selectedItems.includes(item));
  }, [priorityFiltered, selectedCategory, filteredByCategory]);

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

  const displayedCategoryItemsCount = useMemo(() => {
    return visibleCategories.reduce((total, category) => {
      const visibleItems = (filteredByCategory[category] ?? [])
        .filter((item) => !priorityItems.has(item))
        .filter((item) => (!hideOwned || !ownedItems.has(item)) && (!hideUnobtainable || !unobtainableItems.has(item)));

      return total + visibleItems.length;
    }, 0);
  }, [visibleCategories, filteredByCategory, priorityItems, hideOwned, ownedItems, hideUnobtainable, unobtainableItems]);

  const totalDisplayedCards = displayedCategoryItemsCount + (shouldRenderPriorities ? priorityFiltered.length : 0);
  const isHeavyRenderMode = totalDisplayedCards > 180;

  const particlesOptions = useMemo(() => ({
    fullScreen: { enable: true, zIndex: -1 },
    background: { color: { value: 'transparent' } },
    fpsLimit: isHeavyRenderMode ? 45 : 90,
    interactivity: {
      events: {
        onHover: { enable: !isHeavyRenderMode, mode: 'repulse' as const },
        onClick: { enable: !isHeavyRenderMode, mode: 'push' as const },
      },
      modes: {
        repulse: {
          distance: 90,
          duration: 0.4,
        },
        push: { quantity: 2 },
      },
    },
    particles: {
      color: { value: ['#e2c076', '#9cc7ff', '#ffffff'] },
      links: {
        color: '#e2c076',
        distance: 150,
        enable: false,
        opacity: 0.15,
        width: 1,
      },
      move: {
        direction: 'none' as const,
        enable: true,
        outModes: { default: 'out' as const },
        random: true,
        speed: 0.45,
        straight: false,
      },
      number: {
        density: { enable: true, width: 1200 },
        value: isHeavyRenderMode ? 20 : 55,
      },
      opacity: {
        value: { min: 0.08, max: isHeavyRenderMode ? 0.22 : 0.35 },
        animation: {
          enable: !isHeavyRenderMode,
          speed: 0.5,
          sync: false,
        },
      },
      shape: { type: ['circle', 'triangle'] },
      size: {
        value: { min: 1, max: 3 },
        animation: {
          enable: !isHeavyRenderMode,
          speed: 1,
          sync: false,
        },
      },
    },
    detectRetina: true,
  }), [isHeavyRenderMode]);

  const shouldShowSkeletons = isLoading || isUiTransitioning;

  return (
    <div className={`app-container ${activeView === 'solver' ? 'app-container-solver' : ''}`}>
      {particlesReady && (
        <Particles id="tsparticles" options={particlesOptions} />
      )}

      {activeView === 'arsenal' && (
        <header className="header">
          <h1 className="title">Warframe Arsenal</h1>
        </header>
      )}

      {activeView === 'arsenal' && (
        <div className="pre-sticky-actions">
          <button className="export-btn" onClick={exportRemainingJson} type="button">
            Export Remaining
          </button>

          <button className="upload-btn" onClick={() => fileInputRef.current?.click()} type="button">
            Import JSON
          </button>
          <input accept=".json" className="file-input" onChange={handleFileUpload} ref={fileInputRef} type="file" />
        </div>
      )}

      {activeView === 'arsenal' && (
        <div className="floating-view-actions" role="group" aria-label="View actions">
          <button
            className="filters-toggle-btn sticky-controls-toggle sticky-controls-solver-toggle"
            type="button"
            onClick={handleToggleView}
            title="Open Lich solver"
            aria-label="Open Lich solver"
          >
            Lich Solver
          </button>

          <button
            className="filters-toggle-btn sticky-controls-toggle"
            type="button"
            onClick={() => setShowFiltersBar((current) => !current)}
            title={showFiltersBar ? 'Hide filter bar' : 'Show filter bar'}
            aria-label={showFiltersBar ? 'Hide filter bar' : 'Show filter bar'}
          >
            {showFiltersBar ? (
              <svg className="filters-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 4l16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="filters-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            )}
          </button>
        </div>
      )}

      {activeView === 'arsenal' && showFiltersBar && (
      <div className="controls">
        <div className="top-nav">
          <button 
            className={`nav-link ${selectedCategory === 'All' ? 'active' : ''}`}
            onClick={() => handleCategorySelect('All')}
          >
            All
          </button>
          {navCategories.map((category) => (
            <button 
              key={category} 
              className={`nav-link ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => handleCategorySelect(category)}
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

          <select className="filter-select" value={filter} onChange={(event) => handleFilterChange(event.target.value as ItemFilter)}>
            {ITEM_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <label className="switch-container">
            <span className="switch-label">Hide owned</span>
            <input checked={hideOwned} onChange={handleToggleHideOwned} type="checkbox" />
          </label>

          <label className="switch-container">
            <span className="switch-label">Hide unobtainable</span>
            <input checked={hideUnobtainable} onChange={handleToggleHideUnobtainable} type="checkbox" />
          </label>
        </div>
      </div>
      )}

      <main>
        {activeView === 'solver' ? (
          <LichSolverPage onBack={() => setActiveView('arsenal')} />
        ) : (
          <>
        {shouldRenderPriorities && (
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
            showSkeleton={shouldShowSkeletons}
            animateOnReveal={!shouldShowSkeletons}
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
            showSkeleton={shouldShowSkeletons}
            animateOnReveal={!shouldShowSkeletons}
            marketSlugs={marketSlugs}
            onToggleOwned={toggleItem}
            onTogglePriority={togglePriority}
            onToggleUnobtainable={toggleUnobtainable}
          />
        ))}

        {shouldShowSkeletons && visibleCategories.length === 0 && (
          <CategorySection
            id="skeleton_fallback"
            title="Loading"
            category="Loading"
            items={[]}
            ownedItems={ownedItems}
            priorityItems={priorityItems}
            unobtainableItems={unobtainableItems}
            hideOwned={hideOwned}
            hideUnobtainable={hideUnobtainable}
            showSkeleton
            animateOnReveal={false}
            marketSlugs={marketSlugs}
            onToggleOwned={toggleItem}
            onTogglePriority={togglePriority}
            onToggleUnobtainable={toggleUnobtainable}
          />
        )}
          </>
        )}
      </main>

      {activeView === 'arsenal' && showFiltersBar && (
        <>
          <WorldStatePanel
            cycles={worldState.cycles}
            voidTrader={worldState.voidTrader}
            isLoading={isWorldStateLoading}
            onRefresh={refreshWorldState}
          />

          <FissuresPanel
            fissures={worldState.fissures}
            isLoading={isWorldStateLoading}
          />
        </>
      )}

      <ScrollToTopButton />
    </div>
  );
}