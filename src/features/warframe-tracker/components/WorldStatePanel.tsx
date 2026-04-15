import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { CycleData, VoidTraderData } from '../hooks/useWorldState';
import { formatTimeRemaining } from '../hooks/useWorldState';

const COOLDOWN_SECONDS = 30;

type WorldStatePanelProps = {
  cycles: CycleData[];
  voidTrader: VoidTraderData | null;
  isLoading: boolean;
  onRefresh: () => boolean; // returns true if refresh was triggered
};

function getCycleStateClass(state: string): string {
  return `cycle-state cycle-state-${state.toLowerCase()}`;
}

export const WorldStatePanel = memo(function WorldStatePanel({
  cycles,
  voidTrader,
  isLoading,
  onRefresh,
}: WorldStatePanelProps) {
  const [tick, setTick] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(0);

  // Local 1s tick — only this component re-renders
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      if (cooldownRef.current > 0) {
        cooldownRef.current -= 1;
        setCooldown(cooldownRef.current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  void tick;

  const handleRefresh = useCallback(() => {
    const didRefresh = onRefresh();
    if (didRefresh) {
      cooldownRef.current = COOLDOWN_SECONDS;
      setCooldown(COOLDOWN_SECONDS);
    }
  }, [onRefresh]);

  const isCooldown = cooldown > 0;

  return (
    <div className="world-panel world-panel-left">
      <div className="world-panel-header">
        <h3 className="world-panel-title">World State</h3>
        <button
          className={`world-refresh-btn ${isCooldown ? 'on-cooldown' : ''}`}
          onClick={handleRefresh}
          disabled={isCooldown}
          type="button"
          title={isCooldown ? `Cooldown: ${cooldown}s` : 'Refresh world state'}
        >
          <svg className={`refresh-icon ${isLoading ? 'spinning' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6" />
            <path d="M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          {isCooldown && <span className="cooldown-badge">{cooldown}</span>}
        </button>
      </div>

      {/* Cycles */}
      <div className="world-section">
        <h4 className="world-section-title">Cycles</h4>
        {cycles.length === 0 && (
          <div className="world-empty">Loading cycles...</div>
        )}
        {cycles.map((cycle) => (
          <div key={cycle.id} className="cycle-row">
            <div className="cycle-info">
              <span className="cycle-label">{cycle.label}</span>
              <span className={getCycleStateClass(cycle.state)}>{cycle.state}</span>
            </div>
            <span className="cycle-timer">{formatTimeRemaining(cycle.expiry)}</span>
          </div>
        ))}
      </div>

      {/* Void Trader */}
      <div className="world-section">
        <h4 className="world-section-title">Baro Ki&apos;Teer</h4>
        {voidTrader ? (
          <div className="void-trader-card">
            <div className={`void-trader-status ${voidTrader.active ? 'active' : 'away'}`}>
              {voidTrader.active ? 'Present' : 'Away'}
            </div>
            <div className="void-trader-location">
              {voidTrader.location}
            </div>
            <div className="void-trader-timer">
              {voidTrader.active
                ? `Leaves in ${formatTimeRemaining(voidTrader.expiry)}`
                : `Arrives in ${formatTimeRemaining(voidTrader.activation)}`
              }
            </div>
          </div>
        ) : (
          <div className="world-empty">Loading trader info...</div>
        )}
      </div>
    </div>
  );
});
