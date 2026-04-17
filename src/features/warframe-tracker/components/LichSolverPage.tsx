import { memo, useMemo } from 'react';
import FassMod from '../../../assets/FassMod.webp';
import JahuMod from '../../../assets/JahuMod.webp';
import KhraMod from '../../../assets/KhraMod.webp';
import LohkMod from '../../../assets/LohkMod.webp';
import NetraMod from '../../../assets/NetraMod.webp';
import OullMod from '../../../assets/OullMod.webp';
import RisMod from '../../../assets/RisMod.webp';
import VomeMod from '../../../assets/VomeMod.webp';
import XataMod from '../../../assets/XataMod.webp';
import { useLichSolver } from '../hooks/useLichSolver';
import type { LichSolverStateId, RequiemModId } from '../types';

type LichSolverPageProps = {
  onBack: () => void;
};

type RequiemModMeta = {
  id: RequiemModId;
  label: string;
  image: string;
  isJoker?: boolean;
};

type SchemaNode = {
  id: LichSolverStateId;
  label: string;
  left: number;
  top: number;
  isSuccessNode?: boolean;
};

type SchemaEdge = {
  from: LichSolverStateId;
  to: LichSolverStateId;
  label?: string;
};

const REQUIEM_MODS: RequiemModMeta[] = [
  { id: 'fass', label: 'FASS', image: FassMod },
  { id: 'khra', label: 'KHRA', image: KhraMod },
  { id: 'jahu', label: 'JAHU', image: JahuMod },
  { id: 'netra', label: 'NETRA', image: NetraMod },
  { id: 'lohk', label: 'LOHK', image: LohkMod },
  { id: 'ris', label: 'RIS', image: RisMod },
  { id: 'vome', label: 'VOME', image: VomeMod },
  { id: 'xata', label: 'XATA', image: XataMod },
  { id: 'oull', label: 'OULL', image: OullMod, isJoker: true },
];

const REQUIEM_MOD_BY_ID = REQUIEM_MODS.reduce<Record<RequiemModId, RequiemModMeta>>((accumulator, mod) => {
  accumulator[mod.id] = mod;
  return accumulator;
}, {} as Record<RequiemModId, RequiemModMeta>);

const SCHEMA_NODES: SchemaNode[] = [
  { id: 'ORR', label: 'O/R/R', left: 50, top: 6 },
  { id: 'OAR', label: 'O/A/R', left: 50, top: 19 },
  { id: 'AOB', label: 'A/O/B', left: 28, top: 33 },
  { id: 'OAB', label: 'O/A/B', left: 72, top: 33 },
  { id: 'BCA', label: 'B/C/A', left: 12, top: 47 },
  { id: 'ABC', label: 'A/B/C', left: 28, top: 47 },
  { id: 'ACB', label: 'A/C/B', left: 44, top: 47 },
  { id: 'BAC', label: 'B/A/C', left: 62, top: 47 },
  { id: 'CAB', label: 'C/A/B', left: 80, top: 47 },
  { id: 'CBA', label: 'C/B/A', left: 8, top: 61 },
  { id: 'SOLVED', label: 'Great success!!', left: 50, top: 84, isSuccessNode: true },
];

const SCHEMA_EDGES: SchemaEdge[] = [
  { from: 'ORR', to: 'OAR', label: '+/-/-' },
  { from: 'OAR', to: 'AOB', label: '+/-/-' },
  { from: 'OAR', to: 'OAB', label: '+/+/-' },
  { from: 'AOB', to: 'BCA', label: '-/+/-' },
  { from: 'AOB', to: 'ABC', label: '+/+/-' },
  { from: 'AOB', to: 'ACB', label: '+/+/+' },
  { from: 'BCA', to: 'CBA', label: '-/+/+' },
  { from: 'OAB', to: 'BAC', label: '+/+/-' },
  { from: 'OAB', to: 'CAB', label: '+/+/+' },
  { from: 'ABC', to: 'SOLVED' },
  { from: 'ACB', to: 'SOLVED' },
  { from: 'BAC', to: 'SOLVED' },
  { from: 'CAB', to: 'SOLVED' },
  { from: 'CBA', to: 'SOLVED' },
  { from: 'BCA', to: 'SOLVED' },
];

function getSlotLabel(index: number): string {
  if (index === 0) return 'A - 1st discovered murmur';
  if (index === 1) return 'B - 2nd discovered murmur';
  return 'C - 3rd discovered murmur';
}

function getFeedbackButtonClass(style: 'neutral' | 'success' | 'danger'): string {
  if (style === 'success') {
    return 'lich-feedback-btn lich-feedback-btn-success';
  }

  if (style === 'danger') {
    return 'lich-feedback-btn lich-feedback-btn-danger';
  }

  return 'lich-feedback-btn';
}

function getEdgeLabelPosition(from: SchemaNode, to: SchemaNode): { x: number; y: number } {
  return {
    x: (from.left + to.left) / 2,
    y: (from.top + to.top) / 2 - 1.5,
  };
}

export const LichSolverPage = memo(function LichSolverPage({ onBack }: LichSolverPageProps) {
  const {
    discoveredSlots,
    stateId,
    stateDefinition,
    configurationSlots,
    attemptCount,
    history,
    notice,
    setNotice,
    clearDiscoveredSlot,
    addNextDiscoveredMurmur,
    applyFeedback,
    resetMachine,
    clearAll,
  } = useLichSolver();

  const visitedNodes = useMemo(() => {
    const visited = new Set<LichSolverStateId>();
    visited.add(stateId);

    for (const entry of history) {
      visited.add(entry.fromStateId);
      if (entry.toStateId) {
        visited.add(entry.toStateId);
      }
    }

    return visited;
  }, [history, stateId]);

  const displayedHistory = useMemo(() => {
    return history.slice(-6).reverse();
  }, [history]);

  const nodeById = useMemo(() => {
    return SCHEMA_NODES.reduce<Record<LichSolverStateId, SchemaNode>>((accumulator, node) => {
      accumulator[node.id] = node;
      return accumulator;
    }, {} as Record<LichSolverStateId, SchemaNode>);
  }, []);

  return (
    <section className="lich-page" aria-label="Kuva Lich requiem solver">
      <div className="lich-toolbar" role="toolbar" aria-label="Solver actions">
        <p className="lich-current-state">State: {stateDefinition.title} · Attempts: {attemptCount}</p>

        <div className="lich-header-actions">
          <button className="lich-header-btn" type="button" onClick={resetMachine}>
            Reset state machine
          </button>
          <button className="lich-header-btn lich-header-btn-danger" type="button" onClick={clearAll}>
            New hunt
          </button>
          <button className="lich-header-btn" type="button" onClick={onBack}>
            Back to Arsenal
          </button>
        </div>
      </div>

      {notice ? (
        <div className="lich-notice" role="status">
          {notice}
          <button className="lich-notice-dismiss" type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">
            x
          </button>
        </div>
      ) : null}

      <div className="lich-mobile-warning" role="note">
        This solver layout is desktop-first. Use a wider screen for schema readability.
      </div>

      <div className="lich-main-layout">
        <section className="lich-schema-section lich-left-pane" aria-label="Decision schema">
          <h3 className="lich-zone-title">Decision schema (Oull-first)</h3>
          <p className="lich-schema-subtitle">The highlighted node shows the current state machine step.</p>

          <div className="lich-schema-canvas">
            <svg className="lich-schema-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {SCHEMA_EDGES.map((edge) => {
                const fromNode = nodeById[edge.from];
                const toNode = nodeById[edge.to];
                const edgeIsVisited = visitedNodes.has(edge.from) && visitedNodes.has(edge.to);
                const labelPosition = getEdgeLabelPosition(fromNode, toNode);

                return (
                  <g key={`${edge.from}-${edge.to}-${edge.label ?? 'line'}`}>
                    <line
                      className={`lich-schema-edge ${edgeIsVisited ? 'visited' : ''}`}
                      x1={fromNode.left}
                      y1={fromNode.top}
                      x2={toNode.left}
                      y2={toNode.top}
                    />
                    {edge.label ? (
                      <text className="lich-schema-edge-label" x={labelPosition.x} y={labelPosition.y}>
                        {edge.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {SCHEMA_NODES.map((node) => {
              const isActive = node.id === stateId;
              const isVisited = visitedNodes.has(node.id);

              return (
                <div
                  key={node.id}
                  className={`lich-schema-node ${node.isSuccessNode ? 'is-success' : ''} ${isActive ? 'is-active' : ''} ${isVisited ? 'is-visited' : ''}`}
                  style={{ left: `${node.left}%`, top: `${node.top}%` }}
                >
                  {node.label}
                </div>
              );
            })}

            <aside className="lich-schema-legend" aria-label="Schema legend">
              <p><strong>A</strong> - 1st unlocked Requiem</p>
              <p><strong>B</strong> - 2nd unlocked Requiem</p>
              <p><strong>C</strong> - 3rd unlocked Requiem</p>
              <p><strong>R</strong> - Random Requiem</p>
              <p><strong>O</strong> - Oull</p>
            </aside>
          </div>

          <section className="lich-history lich-schema-history" aria-label="Decision history">
            <h4>Recent feedback</h4>
            {displayedHistory.length === 0 ? (
              <p className="lich-history-empty">No decision recorded yet.</p>
            ) : (
              <ul>
                {displayedHistory.map((entry) => (
                  <li key={`${entry.timestamp}-${entry.optionId}`}>
                    <strong>{entry.optionLabel}</strong>
                    <span>{entry.fromStateId} → {entry.toStateId ?? 'dead-end'}</span>
                    <span>Attempt #{entry.attemptCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>

        <div className="lich-zones lich-right-pane">
          <section className="lich-zone">
          <h3 className="lich-zone-title">Discovered murmurs</h3>
          <div className="lich-top-slots">
            {discoveredSlots.map((modId, index) => {
              const slotIndex = index as 0 | 1 | 2;
              const mod = modId ? REQUIEM_MOD_BY_ID[modId] : null;

              return (
                <article
                  key={`discovered-slot-${slotIndex}`}
                  className="lich-discovered-slot"
                >
                  <p className="lich-slot-label">{getSlotLabel(slotIndex)}</p>
                  {mod ? (
                    <div className="lich-slot-content">
                      <img src={mod.image} alt={mod.label} className="lich-slot-image" />
                      <button className="lich-slot-clear" type="button" onClick={() => clearDiscoveredSlot(slotIndex)}>
                        Clear
                      </button>
                    </div>
                  ) : (
                    <div className="lich-slot-empty">Click a requiem mod below to fill this slot</div>
                  )}
                </article>
              );
            })}
          </div>
          </section>

          <section className="lich-zone lich-middle-zone">
          <h3 className="lich-zone-title">Recommended Parazon</h3>
          <p className="lich-state-description">{stateDefinition.description}</p>

          <div className="lich-parazon-slots" aria-live="polite">
            {configurationSlots.length > 0 ? (
              configurationSlots.map((slot, index) => {
                const mod = slot.modId ? REQUIEM_MOD_BY_ID[slot.modId] : null;
                return (
                  <article key={`recommended-slot-${index}`} className={`lich-parazon-slot ${slot.isPlaceholder ? 'is-placeholder' : ''}`}>
                    <span className="lich-parazon-index">Slot {index + 1}</span>
                    {mod ? <img src={mod.image} alt={mod.label} className="lich-parazon-image" /> : null}
                    <span className="lich-parazon-symbol">{slot.symbol}</span>
                    {slot.isRandomResolvedToC ? <span className="lich-slot-hint">auto-resolved with C</span> : null}
                  </article>
                );
              })
            ) : null}
          </div>

          <div className="lich-feedback-group">
            {stateDefinition.feedbackOptions.map((option) => {
              const isBlocked = Boolean(option.requiresKnownA && !discoveredSlots[0]);
              return (
                <button
                  key={option.id}
                  className={getFeedbackButtonClass(option.style)}
                  type="button"
                  onClick={() => applyFeedback(option.id)}
                  disabled={isBlocked}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          </section>

          <section className="lich-zone">
          <h3 className="lich-zone-title">Requiem inventory</h3>
          <div className="lich-mod-inventory">
            {REQUIEM_MODS.map((mod) => {
              const isAssigned = discoveredSlots.includes(mod.id);
              return (
                <button
                  key={mod.id}
                  className={`lich-mod-card ${isAssigned ? 'is-assigned' : ''}`}
                  type="button"
                  onClick={() => addNextDiscoveredMurmur(mod.id)}
                  title={mod.isJoker ? 'Joker mod. Keep for Oull only.' : 'Click to add to discovered murmurs'}
                >
                  <img src={mod.image} alt={mod.label} className="lich-mod-image" />
                  {mod.isJoker ? <span className="lich-mod-badge">Joker</span> : null}
                </button>
              );
            })}
          </div>
          </section>
        </div>
      </div>
    </section>
  );
});
