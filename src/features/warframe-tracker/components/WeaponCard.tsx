import platIcon from '../../../assets/PlatinumLarge.webp';
import wikiIcon from '../../../assets/Wiki.png';
import { getMarketLinkForWeapon, getWeaponImageUrl, getWikiUrl } from '../utils';

type WeaponCardProps = {
  weapon: string;
  isOwned: boolean;
  isPriority: boolean;
  onToggleOwned: () => void;
  onTogglePriority: () => void;
  marketSlugs: Set<string>;
};

export function WeaponCard({
  weapon,
  isOwned,
  isPriority,
  onToggleOwned,
  onTogglePriority,
  marketSlugs,
}: WeaponCardProps) {
  const wikiUrl = getWikiUrl(weapon);
  const imageUrl = getWeaponImageUrl(weapon);
  const { marketUrl, isTradeable } = getMarketLinkForWeapon(weapon, marketSlugs);

  return (
    <div className={`weapon-card ${isOwned ? 'acquired' : ''}`}>
      <div className="weapon-header">
        <span className="weapon-name">{weapon}</span>
        <div className="weapon-actions">
          <button
            className={`priority-btn ${isPriority ? 'active' : ''}`}
            onClick={onTogglePriority}
            type="button"
            title={isPriority ? 'Retirer des priorités' : 'Ajouter aux priorités'}
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
        <img src={imageUrl} alt={weapon} className="weapon-image" loading="lazy" />
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
            title="Probablement non-achetable. Cliquez pour chercher quand même."
          >
            Market (?)
          </a>
        )}
      </div>
    </div>
  );
}