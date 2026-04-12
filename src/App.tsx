import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './App.css';
import defaultWeaponsData from './weapons.json';
import platIcon from './assets/PlatinumLarge.webp';
import wikiIcon from './assets/Wiki.png';
import voltSkin from './assets/VoltRaijinSkin.png';
import revenantSkin from './assets/RevenantMephistoSkin.png';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";
  
type WeaponsData = {
  warframe_weapons: {
    melee: string[];
    primary: string[];
    secondary: string[];
    [key: string]: string[] | undefined;
  }
};

function normalizeWeaponNameForMarket(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, '_');
}

function getMarketSlugCandidates(name: string) {
  const base = normalizeWeaponNameForMarket(name);
  const normalized = base
    .replace(/&/g, 'and')
    .replace(/'/g, '')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return Array.from(
    new Set([
      `${base}_set`,
      base,
      `${normalized}_set`,
      normalized,
    ]),
  );
}

function extractMarketItemUrlNames(payload: unknown): string[] {
  const source = payload as {
    data?: unknown[] | { items?: unknown[] };
    items?: unknown[];
    payload?: { items?: unknown[] };
  };

  let rawItems: unknown[] = [];

  if (Array.isArray(source)) rawItems = source;
  else if (Array.isArray(source.data)) rawItems = source.data;
  else if (Array.isArray(source.items)) rawItems = source.items;
  else if (Array.isArray(source.payload?.items)) rawItems = source.payload.items;
  else if (Array.isArray(source.data?.items)) rawItems = source.data.items;

  return rawItems
    .map((item) => (item as { slug?: unknown; url_name?: unknown }).slug ?? (item as { slug?: unknown; url_name?: unknown }).url_name)
    .filter((slug): slug is string => typeof slug === 'string')
    .map((slug) => slug.toLowerCase());
}

export default function App() {
  const [weaponsData, setWeaponsData] = useState<WeaponsData>(defaultWeaponsData as WeaponsData);
  const [hideOwned, setHideOwned] = useState(() => {
    const saved = localStorage.getItem('wf_hide_owned');
    return saved === 'true';
  });
  
  const [filter, setFilter] = useState(() => {
    const saved = localStorage.getItem('wf_weapon_filter');
    return saved || 'All';
  });
  
  const [ownedWeapons, setOwnedWeapons] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('wf_owned_weapons');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [priorityWeapons, setPriorityWeapons] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('wf_priority_weapons');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [marketSlugs, setMarketSlugs] = useState<Set<string>>(() => {
    const CACHE_KEY = 'wf_market_slugs_cache_v1';
    const CACHE_TS_KEY = 'wf_market_slugs_cache_ts_v1';
    const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12h

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const cachedTs = Number(localStorage.getItem(CACHE_TS_KEY) || '0');
      const isFresh = cached && Number.isFinite(cachedTs) && (Date.now() - cachedTs < CACHE_TTL_MS);
      if (isFresh) {
        const parsed = JSON.parse(cached) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Set(parsed);
        }
      }
    } catch {
      // ignore cache read errors
    }

    return new Set();
  });


  const fileInputRef = useRef<HTMLInputElement>(null);
  const [particlesReady, setParticlesReady] = useState(false);

  // tsParticles v3: engine must be initialized once before rendering <Particles />
  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => setParticlesReady(true));
  }, []);

  useEffect(() => {
    // Force scroll to top on mount to avoid being "teleported" to the bottom
    window.scrollTo(0, 0);
  }, []);

  const particlesLoaded = useCallback(async () => {
    // ready
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const CACHE_KEY = 'wf_market_slugs_cache_v1';
    const CACHE_TS_KEY = 'wf_market_slugs_cache_ts_v1';

    const loadMarketItems = async () => {
      try {
        const response = await fetch('https://api.warframe.market/v2/items', {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const payload = await response.json();
        const slugs = extractMarketItemUrlNames(payload);
        if (slugs.length > 0) {
          setMarketSlugs(new Set(slugs));
          localStorage.setItem(CACHE_KEY, JSON.stringify(slugs));
          localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        }
      } catch {
        // Fallback keeps Market (?) links if API cannot be reached
      }
    };

    void loadMarketItems();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem('wf_owned_weapons', JSON.stringify(Array.from(ownedWeapons)));
  }, [ownedWeapons]);

  useEffect(() => {
    localStorage.setItem('wf_priority_weapons', JSON.stringify(Array.from(priorityWeapons)));
  }, [priorityWeapons]);


  useEffect(() => {
    localStorage.setItem('wf_weapon_filter', filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem('wf_hide_owned', String(hideOwned));
  }, [hideOwned]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.warframe_weapons) {
          setWeaponsData(data);
          alert('Liste des armes importée avec succès !');
        } else {
          alert("Le fichier JSON n'a pas le bon format.");
        }
      } catch {
        alert("Erreur de lecture du fichier JSON.");
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleWeapon = (weapon: string) => {
    setOwnedWeapons(prev => {
      const next = new Set(prev);
      if (next.has(weapon)) {
        next.delete(weapon);
      } else {
        next.add(weapon);
        // Automatiquement enlever de la priorité si l'arme est acquise
        setPriorityWeapons(prevPriority => {
          const nextPriority = new Set(prevPriority);
          nextPriority.delete(weapon);
          return nextPriority;
        });
      }
      return next;
    });
  };


  const togglePriority = (weapon: string) => {
    setPriorityWeapons(prev => {
      const next = new Set(prev);
      if (next.has(weapon)) next.delete(weapon);
      else next.add(weapon);
      return next;
    });
  };


  const applyFilter = useCallback((weapons: string[]) => {
    let result = [...weapons];
    if (filter === 'Kuva') result = result.filter(w => w.toLowerCase().includes('kuva'));
    else if (filter === 'Tenet') result = result.filter(w => w.toLowerCase().includes('tenet'));
    else if (filter === 'Coda') result = result.filter(w => w.toLowerCase().includes('coda'));
    else if (filter === 'Standard') {
      result = result.filter(w => {
        const name = w.toLowerCase();
        return !name.includes('kuva') && !name.includes('tenet') && !name.includes('coda');
      });
    }
    return result;
  }, [filter]);

  const primaryFiltered = useMemo(() => applyFilter(weaponsData.warframe_weapons.primary || []), [weaponsData.warframe_weapons.primary, applyFilter]);
  const secondaryFiltered = useMemo(() => applyFilter(weaponsData.warframe_weapons.secondary || []), [weaponsData.warframe_weapons.secondary, applyFilter]);
  const meleeFiltered = useMemo(() => applyFilter(weaponsData.warframe_weapons.melee || []), [weaponsData.warframe_weapons.melee, applyFilter]);

  const allFilteredWeapons = useMemo(() => [
    ...primaryFiltered,
    ...secondaryFiltered,
    ...meleeFiltered
  ], [primaryFiltered, secondaryFiltered, meleeFiltered]);

  const priorityFiltered = useMemo(() => {
    // Priority filter only shows weapons that are in priorityWeapons AND currently visible via filters
    let result = allFilteredWeapons.filter(w => priorityWeapons.has(w));
    if (hideOwned) result = result.filter(w => !ownedWeapons.has(w));
    return result;
  }, [allFilteredWeapons, priorityWeapons, hideOwned, ownedWeapons]);


  const remainingToFarm = useMemo(() => 
    allFilteredWeapons.filter(w => !ownedWeapons.has(w)).length
  , [allFilteredWeapons, ownedWeapons]);


  const exportRemainingJson = () => {
    const remaining = {
      warframe_weapons: {
        primary: (weaponsData.warframe_weapons.primary || []).filter(w => !ownedWeapons.has(w)),
        secondary: (weaponsData.warframe_weapons.secondary || []).filter(w => !ownedWeapons.has(w)),
        melee: (weaponsData.warframe_weapons.melee || []).filter(w => !ownedWeapons.has(w))
      }
    };
    const blob = new Blob([JSON.stringify(remaining, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'remaining_weapons.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {particlesReady && (
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          options={{
            fullScreen: { enable: true, zIndex: -1 },
            background: {
              color: { value: "transparent" },
            },
            fpsLimit: 60,
            interactivity: {
              events: {
                onHover: {
                  enable: true,
                  mode: "grab",
                },
              },
              modes: {
                grab: {
                  distance: 200,
                  links: {
                    opacity: 0.5,
                    color: "#e2c076"
                  },
                },
              },
            },
            particles: {
              color: { value: "#e2c076" },
              links: {
                color: "#e2c076",
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: true,
                speed: 1,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  width: 800,
                },
                value: 80,
              },
              opacity: {
                value: 0.3,
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 1, max: 3 },
              },
            },
            detectRetina: true,
          }}
        />
      )}
      <header className="header">
        <h1 className="title">Warframe Arsenal</h1>
      </header>

      <div className="pre-sticky-actions">
        <button className="export-btn" onClick={exportRemainingJson}>
          Exporter Restants
        </button>

        <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
          Importer JSON
        </button>
        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="file-input"
        />
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

        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="All">Toutes (A-Z)</option>
            <option value="Standard">Normales (Non-Kuva/Tenet/Coda)</option>
            <option value="Kuva">Kuva</option>
            <option value="Tenet">Tenet</option>
            <option value="Coda">Coda</option>
          </select>

          <label className="switch-container" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--wf-text-secondary)', marginRight: '0.5rem' }}>Masquer acquises</span>
            <input 
              type="checkbox" 
              checked={hideOwned} 
              onChange={() => setHideOwned(!hideOwned)}
              style={{ cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>

      <main>
        {priorityFiltered.length > 0 && (
          <CategorySection 
            id="priority"
            title="Priorités" 
            weapons={priorityFiltered} 
            owned={ownedWeapons}
            onToggle={toggleWeapon}
            hideOwned={hideOwned}
            priority={priorityWeapons}
            onTogglePriority={togglePriority}
            marketSlugs={marketSlugs}
          />
        )}
        <CategorySection 
          id="primary"
          title="Armes Principales" 
          weapons={primaryFiltered.filter(w => !priorityWeapons.has(w))} 
          owned={ownedWeapons}
          onToggle={toggleWeapon}
          hideOwned={hideOwned}
          priority={priorityWeapons}
          onTogglePriority={togglePriority}
          marketSlugs={marketSlugs}
        />
        <CategorySection 
          id="secondary"
          title="Armes Secondaires" 
          weapons={secondaryFiltered.filter(w => !priorityWeapons.has(w))} 
          owned={ownedWeapons}
          onToggle={toggleWeapon}
          hideOwned={hideOwned}
          priority={priorityWeapons}
          onTogglePriority={togglePriority}
          marketSlugs={marketSlugs}
        />
        <CategorySection 
          id="melee"
          title="Armes de Mêlée" 
          weapons={meleeFiltered.filter(w => !priorityWeapons.has(w))} 
          owned={ownedWeapons}
          onToggle={toggleWeapon}
          hideOwned={hideOwned}
          priority={priorityWeapons}
          onTogglePriority={togglePriority}
          marketSlugs={marketSlugs}
        />

      </main>

      
      <img src={voltSkin} alt="Volt Raijin" className="decoration-skin left-skin" />
      <img src={revenantSkin} alt="Revenant Mephisto" className="decoration-skin right-skin" />

      <ScrollToTopButton />
    </div>
  );
}

function CategorySection({ 
  id,
  title, 
  weapons, 
  owned, 
  onToggle,
  hideOwned,
  priority,
  onTogglePriority,
  marketSlugs
}: { 
  id: string,
  title: string, 
  weapons: string[], 
  owned: Set<string>, 
  onToggle: (w: string) => void,
  hideOwned: boolean,
  priority: Set<string>,
  onTogglePriority: (w: string) => void,
  marketSlugs: Set<string>
}) {

  const filteredWeapons = useMemo(() => {
    let result = [...weapons];
    if (hideOwned) result = result.filter(w => !owned.has(w));
    return result.sort((a,b) => a.localeCompare(b));
  }, [weapons, hideOwned, owned]);

  const categoryRemainingCount = weapons.filter(w => !owned.has(w)).length;

  return (
    <section id={id} className="category-section">
      <div className="category-header">
        <h3 className="category-title">
          {title} ({categoryRemainingCount} restantes)
        </h3>
      </div>

      {filteredWeapons.length === 0 ? (
        <div className="empty-state">Aucune arme trouvée pour ce filtre.</div>
      ) : (
        <div className="weapons-grid">
          {filteredWeapons.map(weapon => (
            <WeaponCard 
              key={weapon} 
              weapon={weapon} 
              isOwned={owned.has(weapon)}
              onToggle={() => onToggle(weapon)}
              isPriority={priority.has(weapon)}
              onTogglePriority={() => onTogglePriority(weapon)}
              marketSlugs={marketSlugs}
            />

          ))}
        </div>
      )}
    </section>
  );
}

function WeaponCard({ 
  weapon, 
  isOwned,
  onToggle,
  isPriority,
  onTogglePriority,
  marketSlugs
}: { 
  weapon: string, 
  isOwned: boolean,
  onToggle: () => void,
  isPriority: boolean,
  onTogglePriority: () => void,
  marketSlugs: Set<string>
}) {

  const marketCandidates = getMarketSlugCandidates(weapon);
  const baseSlug = normalizeWeaponNameForMarket(weapon);
  const matchedSlug = marketCandidates.find((candidate) => marketSlugs.has(candidate)) ?? null;
  const formattedNameWiki = weapon.replace(/ /g, '_');

  const wikiUrl = `https://wiki.warframe.com/w/${formattedNameWiki}`;

  let marketUrl = '';
  let isTradeable = false;
  const isKuva = weapon.toLowerCase().includes('kuva');
  const isTenet = weapon.toLowerCase().includes('tenet');

  if (matchedSlug) {
    marketUrl = `https://warframe.market/items/${matchedSlug}?type=sell`;
    isTradeable = true;
  } else if (isKuva) {
    marketUrl = `https://warframe.market/auctions/search?type=lich&weapon_url_name=${baseSlug}`;
    isTradeable = true;
  } else if (isTenet) {
    marketUrl = `https://warframe.market/auctions/search?type=sister&weapon_url_name=${baseSlug}`;
    isTradeable = true;
  } else {
    marketUrl = `https://warframe.market/items/${baseSlug}?type=sell`;
  }

  // Image URL using Wiki logic
  const imageUrl = `https://wiki.warframe.com/images/${weapon.replace(/ /g, '')}.png`;

  return (
    <div className={`weapon-card ${isOwned ? 'acquired' : ''}`}>
      <div className="weapon-header">
        <span className="weapon-name">{weapon}</span>
        <div className="weapon-actions">
          <button 
            className={`priority-btn ${isPriority ? 'active' : ''}`} 
            onClick={onTogglePriority}
            title={isPriority ? "Retirer des priorités" : "Ajouter aux priorités"}
          >
            ★
          </button>
          <label className="checkbox-container">
            <input type="checkbox" onChange={onToggle} checked={isOwned} />
            <span className="checkmark"></span>
          </label>
        </div>
      </div>


      <div className="weapon-image-container">
        {imageUrl ? (
          <img src={imageUrl} alt={weapon} className="weapon-image" loading="lazy" />
        ) : (
          <span style={{color: 'var(--wf-text-muted)', fontStyle: 'italic', fontSize: '0.9rem'}}>Image indisponible</span>
        )}
      </div>

      <div className="weapon-links">
        <a href={wikiUrl} target="_blank" rel="noreferrer" className="link-item wiki">
          <img src={wikiIcon} alt="Wiki" className="icon" />
          Wiki
        </a>
        
        {isTradeable ? (
          <a href={marketUrl} target="_blank" rel="noreferrer" className="link-item market">
            <img src={platIcon} alt="Market" className="icon" />
            Market
          </a>
        ) : (
          <a href={marketUrl} target="_blank" rel="noreferrer" className="link-item uncertain" title="Probablement non-achetable. Cliquez pour chercher quand même.">
            Market (?)
          </a>
        )}
      </div>
    </div>
  );
}

function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) setIsVisible(true);
      else setIsVisible(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <button 
      className="scroll-to-top" 
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="Remonter en haut"
    >
      ↑
    </button>
  );
}
