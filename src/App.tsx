import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import defaultWeaponsData from './weapons.json';
import platIcon from './assets/PlatinumLarge.webp';
import wikiIcon from './assets/Wiki.png';

type WeaponsData = {
  warframe_weapons: {
    melee: string[];
    primary: string[];
    secondary: string[];
    [key: string]: string[] | undefined;
  }
};

function isTradeableWeapon(name: string) {
  const prefixesAndSuffixes = ['Kuva ', 'Tenet ', 'Coda ', 'Prisma ', 'Vandal', 'Wraith', 'Prime', 'Rakta ', 'Synoid ', 'Sancti ', 'Secura ', 'Telos ', 'Vaykor '];
  if (prefixesAndSuffixes.some(p => name.includes(p))) return true;

  // Specific weapons that drop as tradeable parts
  const specificTradeable = [
    'Aeolak', 'Arum Spinosa', 'Cinta', 'Cortege', 'Cyngas', 'Mandonel', 'Morgha', 'Phaedra', 
    'Sporothrix', 'Agkuza', 'Kaszas', 'Onorix', 'Rathbone', 'Quassus', 'Gotva Prime', 'Hespar',
    'Pennant', 'Korumm', 'Nepheri', 'Athodai', 'Shedu', 'Carmine Penta', 'Centaur', 'Corvas',
    'Dual Decurion', 'Fluctus', 'Knux', 'Velocitus', 'Larkspur'
  ];
  
  return specificTradeable.includes(name);
}

export default function App() {
  const [weaponsData, setWeaponsData] = useState<WeaponsData>(defaultWeaponsData as WeaponsData);
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('wf_theme') === 'light');
  
  const [ownedWeapons, setOwnedWeapons] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('wf_owned_weapons');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('wf_theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('wf_theme', 'dark');
    }
  }, [isLightMode]);

  useEffect(() => {
    localStorage.setItem('wf_owned_weapons', JSON.stringify(Array.from(ownedWeapons)));
  }, [ownedWeapons]);

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
      } catch (err) {
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
      if (next.has(weapon)) next.delete(weapon);
      else next.add(weapon);
      return next;
    });
  };

  const resetProgress = () => {
    if (confirm("Voulez-vous vraiment réinitialiser toute votre progression ?")) {
      setOwnedWeapons(new Set());
    }
  };

  const allWeapons = [
    ...(weaponsData.warframe_weapons.primary || []),
    ...(weaponsData.warframe_weapons.secondary || []),
    ...(weaponsData.warframe_weapons.melee || [])
  ];

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Warframe Arsenal</h1>
      </header>

      <div className="controls">
        <div className="top-nav">
          <a href="#primary" className="nav-link">Principales</a>
          <a href="#secondary" className="nav-link">Secondaires</a>
          <a href="#melee" className="nav-link">Mêlée</a>
        </div>
        
        <div className="summary-stats">
          {ownedWeapons.size} / {allWeapons.length} arme(s) acquise(s)
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="theme-toggle" onClick={() => setIsLightMode(!isLightMode)}>
            {isLightMode ? "Mode Sombre" : "Mode Clair"}
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
          
          <button className="reset-button" onClick={resetProgress}>Réinitialiser</button>
        </div>
      </div>

      <main>
        <CategorySection 
          id="primary"
          title="Armes Principales" 
          weapons={weaponsData.warframe_weapons.primary || []} 
          owned={ownedWeapons}
          onToggle={toggleWeapon}
        />
        <CategorySection 
          id="secondary"
          title="Armes Secondaires" 
          weapons={weaponsData.warframe_weapons.secondary || []} 
          owned={ownedWeapons}
          onToggle={toggleWeapon}
        />
        <CategorySection 
          id="melee"
          title="Armes de Mêlée" 
          weapons={weaponsData.warframe_weapons.melee || []} 
          owned={ownedWeapons}
          onToggle={toggleWeapon}
        />
      </main>
      <ScrollToTopButton />
    </div>
  );
}

function CategorySection({ 
  id,
  title, 
  weapons, 
  owned, 
  onToggle
}: { 
  id: string,
  title: string, 
  weapons: string[], 
  owned: Set<string>, 
  onToggle: (w: string) => void
}) {
  const [filter, setFilter] = useState('All');

  const filteredWeapons = useMemo(() => {
    let result = [...weapons];

    if (filter === 'Kuva') result = result.filter(w => w.startsWith('Kuva '));
    else if (filter === 'Tenet') result = result.filter(w => w.startsWith('Tenet '));
    else if (filter === 'Coda') result = result.filter(w => w.startsWith('Coda '));

    return result.sort((a,b) => a.localeCompare(b));
  }, [weapons, filter]);

  const categoryOwnedCount = weapons.filter(w => owned.has(w)).length;

  return (
    <section id={id} className="category-section">
      <div className="category-header">
        <h3 className="category-title">
          {title} ({categoryOwnedCount}/{weapons.length})
        </h3>
        <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="All">Tous (A-Z)</option>
          <option value="Kuva">Kuva</option>
          <option value="Tenet">Tenet</option>
          <option value="Coda">Coda</option>
        </select>
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
  onToggle
}: { 
  weapon: string, 
  isOwned: boolean,
  onToggle: () => void
}) {
  const formattedNameMarket = weapon.toLowerCase().replace(/ /g, '_');
  const formattedNameWiki = weapon.replace(/ /g, '_');

  const wikiUrl = `https://wiki.warframe.com/w/${formattedNameWiki}`;

  let marketUrl = '';
  let isSpecial = false;

  if (weapon.startsWith('Kuva ')) {
    marketUrl = `https://warframe.market/auctions/search?type=lich&weapon_url_name=${formattedNameMarket}`;
    isSpecial = true;
  } else if (weapon.startsWith('Tenet ')) {
    marketUrl = `https://warframe.market/auctions/search?type=sister&weapon_url_name=${formattedNameMarket}`;
    isSpecial = true;
  } else {
    marketUrl = `https://warframe.market/items/${formattedNameMarket}_set`;
  }

  const fullMarketUrl = isSpecial ? marketUrl : `${marketUrl}?type=sell`;

  const isTradeable = isTradeableWeapon(weapon);

  // Image URL using Wiki logic
  const imageUrl = `https://wiki.warframe.com/images/${weapon.replace(/ /g, '')}.png`;

  return (
    <div className={`weapon-card ${isOwned ? 'acquired' : ''}`}>
      <div className="weapon-header">
        <span className="weapon-name">{weapon}</span>
        <label className="checkbox-container">
          <input type="checkbox" onChange={onToggle} checked={isOwned} />
          <span className="checkmark"></span>
        </label>
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
          <a href={fullMarketUrl} target="_blank" rel="noreferrer" className="link-item market">
            <img src={platIcon} alt="Market" className="icon" />
            Market
          </a>
        ) : (
          <a href={fullMarketUrl} target="_blank" rel="noreferrer" className="link-item uncertain" title="Probablement non-achetable. Cliquez pour chercher quand même.">
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
