import { useMemo } from 'react';
import { useSpacetimeDB } from 'spacetimedb/react';

type HofEntry = {
  hofId: number;
  sessionId: number;
  fitness: number;
  distanceToHole: number;
  generationsToSolve: number;
  origin: string;
  isHoleInOne: boolean;
  trajectoryJson: string;
};

type HallOfFameProps = {
  entries: readonly HofEntry[];
  selectedHofId: number | null;
  onSelectEntry: (hofId: number | null) => void;
  onBack: () => void;
};

export default function HallOfFame({
  entries,
  selectedHofId,
  onSelectEntry,
  onBack,
}: HallOfFameProps) {
  const { getConnection } = useSpacetimeDB();

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.hofId - a.hofId),
    [entries],
  );

  const handleClear = () => {
    const conn = getConnection();
    if (!conn) return;
    conn.reducers.clearHallOfFame({});
    onSelectEntry(null);
  };

  return (
    <div
      className="ui-panel ui-scroll"
      style={{
        position: 'absolute',
        top: 60,
        right: 12,
        bottom: 12,
        width: 280,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="ui-panel-header" style={{ marginBottom: 0 }}>Hall of Fame</div>
        <button className="ui-btn" onClick={onBack} style={{ fontSize: 10, padding: '3px 8px' }}>
          Back to Evolution
        </button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ opacity: 0.5, textAlign: 'center', marginTop: 40, fontSize: 12 }}>
          No entries yet. Complete a session to archive your best genome.
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map((entry) => {
            const isSelected = entry.hofId === selectedHofId;
            return (
              <div
                key={entry.hofId}
                onClick={() => onSelectEntry(entry.hofId)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(102, 204, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: isSelected
                    ? '1px solid rgba(102, 204, 255, 0.4)'
                    : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {entry.isHoleInOne && (
                    <span style={{ color: '#ffd700', fontSize: 14 }}>&#9733;</span>
                  )}
                  <span style={{ fontWeight: 600, fontSize: 12 }}>
                    Session #{entry.sessionId}
                  </span>
                  <span className={`ui-badge ui-badge--${entry.origin}`} style={{ marginLeft: 'auto' }}>
                    {entry.origin}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 10, opacity: 0.7 }}>
                  <span>Fitness: <span style={{ color: '#ffd700' }}>{entry.fitness.toFixed(4)}</span></span>
                  <span>Dist: {entry.distanceToHole.toFixed(1)}yd</span>
                  <span>Gen {entry.generationsToSolve}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sorted.length > 0 && (
        <button
          className="ui-btn"
          onClick={handleClear}
          style={{ marginTop: 8, fontSize: 10, opacity: 0.6, alignSelf: 'center' }}
        >
          Clear Hall of Fame
        </button>
      )}
    </div>
  );
}
