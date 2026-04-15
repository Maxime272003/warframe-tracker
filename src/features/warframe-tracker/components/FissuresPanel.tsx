import { memo, useEffect, useState } from 'react';
import type { FissureData } from '../hooks/useWorldState';
import { formatTimeRemaining } from '../hooks/useWorldState';

type FissuresPanelProps = {
  fissures: FissureData[];
  isLoading: boolean;
};

const TIER_COLORS: Record<string, string> = {
  Lith: '#a8b6a0',
  Meso: '#c4cfa0',
  Neo: '#d4a86a',
  Axi: '#e8c46a',
  Requiem: '#d46a6a',
  Omnia: '#9a8aff',
};

function getTierColor(tier: string): string {
  return TIER_COLORS[tier] ?? 'var(--wf-text-secondary)';
}

export const FissuresPanel = memo(function FissuresPanel({
  fissures,
  isLoading,
}: FissuresPanelProps) {
  const [showSteelPath, setShowSteelPath] = useState(true);
  const [tick, setTick] = useState(0);

  // Local 1s tick — only this component re-renders
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  void tick;

  // Filter: exclude Railjack storms, then split by normal / steel path
  const filtered = fissures.filter((f) => {
    if (f.isStorm) return false;
    if (formatTimeRemaining(f.expiry) === 'Expired') return false;
    return showSteelPath ? f.isHard : !f.isHard;
  });

  return (
    <div className="world-panel world-panel-right">
      <div className="world-panel-header">
        <h3 className="world-panel-title">Fissures</h3>
        <div className="fissure-mode-toggle">
          <button
            className={`fissure-mode-btn ${!showSteelPath ? 'active' : ''}`}
            onClick={() => setShowSteelPath(false)}
            type="button"
          >
            Normal
          </button>
          <button
            className={`fissure-mode-btn steel-path ${showSteelPath ? 'active' : ''}`}
            onClick={() => setShowSteelPath(true)}
            type="button"
          >
            Steel Path
          </button>
        </div>
      </div>

      <div className="fissures-list">
        {isLoading && filtered.length === 0 && (
          <div className="world-empty">Loading fissures...</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="world-empty">No fissures available</div>
        )}
        {filtered.map((fissure) => (
          <div key={fissure.id} className="fissure-row">
            <div className="fissure-tier-badge" style={{ borderColor: getTierColor(fissure.tier), color: getTierColor(fissure.tier) }}>
              {fissure.tier}
            </div>
            <div className="fissure-info">
              <span className="fissure-node">{fissure.missionType} — {fissure.enemy}</span>
              <span className="fissure-type">{fissure.node}</span>
            </div>
            <span className="fissure-timer">{formatTimeRemaining(fissure.expiry)}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
