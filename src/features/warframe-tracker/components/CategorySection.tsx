import { memo } from 'react';
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
        <div className="weapons-grid">
          {visibleItems.map((item) => (
            <ItemCard
              key={item}
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
          ))}
        </div>
      )}
    </section>
  );
});