import { memo } from 'react';
import platIcon from '../../../assets/PlatinumLarge.webp';
import wikiIcon from '../../../assets/Wiki.png';
import { getMarketLinkForItem, getItemImageUrl, getWikiUrl } from '../utils';

type ItemCardProps = {
  item: string;
  category: string;
  isOwned: boolean;
  isPriority: boolean;
  onToggleOwned: () => void;
  onTogglePriority: () => void;
  marketSlugs: Set<string>;
};

export const ItemCard = memo(function ItemCard({
  item,
  category,
  isOwned,
  isPriority,
  onToggleOwned,
  onTogglePriority,
  marketSlugs,
}: ItemCardProps) {
  const wikiUrl = getWikiUrl(item);
  const imageUrl = getItemImageUrl(item, category);
  const { marketUrl, isTradeable } = getMarketLinkForItem(item, marketSlugs);

  return (
    <div className={`weapon-card ${isOwned ? 'acquired' : ''}`}>
      <div className="weapon-header">
        <span className="weapon-name">{item}</span>
        <div className="weapon-actions">
          <button
            className={`priority-btn ${isPriority ? 'active' : ''}`}
            onClick={onTogglePriority}
            type="button"
            title={isPriority ? 'Remove from priorities' : 'Add to priorities'}
          >
            ★
          </button>
          <label className="checkbox-container">
            <input type="checkbox" onChange={onToggleOwned} checked={isOwned} />
            <span className="checkmark"></span>
          </label>
        </div>
      </div>

      <div className="weapon-image-container">
        <img src={imageUrl} alt={item} className="weapon-image" loading="lazy" />
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
          <a
            href={marketUrl}
            target="_blank"
            rel="noreferrer"
            className="link-item uncertain"
            title="Probably not tradeable. Click to search anyway."
          >
            Market (?)
          </a>
        )}
      </div>
    </div>
  );
});
