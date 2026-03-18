import { useMemo } from 'react';

type HofEntry = {
  hofId: number;
  playerName: string;
  courseVersion: number;
  generationsToSolve: number;
};

type HallOfFameProps = {
  entries: readonly HofEntry[];
  onBack: () => void;
};

export default function HallOfFame({ entries, onBack }: HallOfFameProps) {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.hofId - a.hofId),
    [entries],
  );

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
          Back
        </button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ opacity: 0.5, textAlign: 'center', marginTop: 40, fontSize: 12 }}>
          No hole-in-ones yet. Be the first!
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map((entry) => (
            <div
              key={entry.hofId}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255, 215, 0, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: '#ffd700', fontSize: 14 }}>&#9733;</span>
                <span style={{ fontWeight: 600, fontSize: 12, color: '#66ccff' }}>
                  {entry.playerName}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 10, opacity: 0.7 }}>
                <span>Hole #{entry.courseVersion}</span>
                <span>{entry.generationsToSolve} generations</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
