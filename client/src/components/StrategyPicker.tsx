import { useState } from 'react';

type ChampionBall = {
  championId: number;
  courseVersion: number;
  generationsToSolve: number;
};

type StrategyPickerProps = {
  hasCarryOver: boolean;
  championBalls: readonly ChampionBall[];
  onPick: (strategy: string, championId?: number) => void;
};

export default function StrategyPicker({
  hasCarryOver,
  championBalls,
  onPick,
}: StrategyPickerProps) {
  const [selectedChampion, setSelectedChampion] = useState<number | null>(null);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 100,
      }}
    >
      <div
        className="ui-panel win-overlay"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          padding: '28px 36px',
          minWidth: 380,
          maxWidth: 440,
        }}
      >
        <div className="ui-panel-header" style={{ fontSize: 14, marginBottom: 16 }}>
          Choose Your Strategy
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
          {/* Fresh Start */}
          <button
            className="ui-btn ui-btn--green"
            style={{ width: '100%', padding: '12px 16px', textAlign: 'left' }}
            onClick={() => onPick('fresh')}
          >
            <div style={{ fontWeight: 700 }}>Fresh Start</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
              12 completely random genomes
            </div>
          </button>

          {/* Carry Over */}
          <button
            className="ui-btn"
            style={{ width: '100%', padding: '12px 16px', textAlign: 'left' }}
            disabled={!hasCarryOver}
            onClick={() => onPick('carryOver')}
          >
            <div style={{ fontWeight: 700 }}>Carry Over</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
              {hasCarryOver
                ? 'Seed with your best genome from the last round + 11 random'
                : 'No previous genome available'}
            </div>
          </button>

          {/* Champion Ball */}
          {championBalls.length > 0 && (
            <div
              className="ui-panel"
              style={{
                padding: '10px 12px',
                background: 'rgba(255, 215, 0, 0.05)',
                border: '1px solid rgba(255, 215, 0, 0.2)',
              }}
            >
              <div style={{ fontWeight: 700, color: '#ffd700', fontSize: 12, marginBottom: 8 }}>
                Use Champion Ball
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {championBalls.map((c) => (
                  <div
                    key={c.championId}
                    onClick={() => setSelectedChampion(c.championId)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: selectedChampion === c.championId
                        ? 'rgba(255, 215, 0, 0.15)'
                        : 'rgba(255,255,255,0.03)',
                      border: selectedChampion === c.championId
                        ? '1px solid rgba(255, 215, 0, 0.4)'
                        : '1px solid transparent',
                      fontSize: 11,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Hole #{c.courseVersion}</span>
                    <span style={{ opacity: 0.6 }}>
                      {c.generationsToSolve} gens
                    </span>
                  </div>
                ))}
              </div>
              <button
                className="ui-btn ui-btn--gold"
                style={{ width: '100%' }}
                disabled={selectedChampion == null}
                onClick={() => selectedChampion != null && onPick('champion', selectedChampion)}
              >
                Use Selected Champion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
