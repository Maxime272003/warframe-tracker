import { memo, type CSSProperties } from 'react';
import { ItemCard } from './ItemCard';

type CategorySectionProps = {
  id: string;
  title: string;
  category: string;
  items: string[];
  ownedItems: Set<string>;
  priorityItems: Set<string>;
  unobtainableItems: Set<string>;
  hideOwned: boolean;
  hideUnobtainable: boolean;
  showSkeleton?: boolean;
  animateOnReveal?: boolean;
  marketSlugs: Set<string>;
  onToggleOwned: (item: string) => void;
  onTogglePriority: (item: string) => void;
  onToggleUnobtainable: (item: string) => void;
};

export const CategorySection = memo(function CategorySection({
  id,
  title,
  category,
  items,
  ownedItems,
  priorityItems,
  unobtainableItems,
  hideOwned,
  hideUnobtainable,
  showSkeleton = false,
  animateOnReveal = false,
  marketSlugs,
  onToggleOwned,
  onTogglePriority,
  onToggleUnobtainable,
}: CategorySectionProps) {
  const visibleItems = items
    .filter((item) => (!hideOwned || !ownedItems.has(item)) && (!hideUnobtainable || !unobtainableItems.has(item)))
    .slice()
    .sort((left, right) => left.localeCompare(right));

  const remainingCount = items.filter((item) => !ownedItems.has(item) && !unobtainableItems.has(item)).length;

  if (showSkeleton) {
    return (
      <section id={id} className="category-section">
        <div className="category-header">
          <h3 className="category-title skeleton-title">
            <span className="skeleton-text skeleton-effect-fade">{title} loading</span>
          </h3>
        </div>
        <div className="weapons-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <article className="weapon-card skeleton-card" key={`${id}_skeleton_${index}`}>
              <div className="skeleton-card-header">
                <span className="skeleton-text skeleton-effect-fade">Loading item</span>
                <div className="skeleton-block skeleton-effect-fade skeleton-checkbox" />
              </div>
              <div className="skeleton-block skeleton-effect-fade skeleton-image" />
              <div className="skeleton-card-links">
                <div className="skeleton-block skeleton-effect-fade skeleton-link" />
                <div className="skeleton-block skeleton-effect-fade skeleton-link" />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id={id} className="category-section">
      <div className="category-header">
        <h3 className="category-title">
          {title} ({remainingCount} remaining)
        </h3>
      </div>

      {visibleItems.length === 0 ? (
        <div className="empty-state">No items found for this filter.</div>
      ) : (
        <div className={`category-content ${animateOnReveal ? 'smooth-reveal' : ''}`}>
          <div className="weapons-grid">
            {visibleItems.map((item, index) => (
              <div key={item} className={animateOnReveal ? 'item-enter' : ''} style={{ '--enter-index': index } as CSSProperties}>
                <ItemCard
                  item={item}
                  category={category}
                  isOwned={ownedItems.has(item)}
                  isPriority={priorityItems.has(item)}
                  isUnobtainable={unobtainableItems.has(item)}
                  onToggleOwned={() => onToggleOwned(item)}
                  onTogglePriority={() => onTogglePriority(item)}
                  onToggleUnobtainable={() => onToggleUnobtainable(item)}
                  marketSlugs={marketSlugs}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
});