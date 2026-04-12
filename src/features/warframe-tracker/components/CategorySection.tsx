import { WeaponCard } from './WeaponCard';

type CategorySectionProps = {
  id: string;
  title: string;
  weapons: string[];
  ownedWeapons: Set<string>;
  priorityWeapons: Set<string>;
  hideOwned: boolean;
  marketSlugs: Set<string>;
  onToggleOwned: (weapon: string) => void;
  onTogglePriority: (weapon: string) => void;
};

export function CategorySection({
  id,
  title,
  weapons,
  ownedWeapons,
  priorityWeapons,
  hideOwned,
  marketSlugs,
  onToggleOwned,
  onTogglePriority,
}: CategorySectionProps) {
  const visibleWeapons = weapons
    .filter((weapon) => !hideOwned || !ownedWeapons.has(weapon))
    .slice()
    .sort((left, right) => left.localeCompare(right));

  const remainingCount = weapons.filter((weapon) => !ownedWeapons.has(weapon)).length;

  return (
    <section id={id} className="category-section">
      <div className="category-header">
        <h3 className="category-title">
          {title} ({remainingCount} restantes)
        </h3>
      </div>

      {visibleWeapons.length === 0 ? (
        <div className="empty-state">Aucune arme trouvée pour ce filtre.</div>
      ) : (
        <div className="weapons-grid">
          {visibleWeapons.map((weapon) => (
            <WeaponCard
              key={weapon}
              weapon={weapon}
              isOwned={ownedWeapons.has(weapon)}
              isPriority={priorityWeapons.has(weapon)}
              onToggleOwned={() => onToggleOwned(weapon)}
              onTogglePriority={() => onTogglePriority(weapon)}
              marketSlugs={marketSlugs}
            />
          ))}
        </div>
      )}
    </section>
  );
}