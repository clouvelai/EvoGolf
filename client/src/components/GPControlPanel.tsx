const PHASES = ['init', 'simulating', 'evaluated', 'selecting', 'breeding', 'complete'];

type GPControlPanelProps = {
  phase: string | null;
  genNumber: number | null;
  bestFitness: number | null;
  avgFitness: number | null;
  hasPopulation: boolean;
  autoEvolving: boolean;
  speedMultiplier: number;
  hofCount: number;
  onInitialize: () => void;
  onNextGen: () => void;
  onToggleAutoEvolve: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenHof: () => void;
};

export default function GPControlPanel({
  phase,
  genNumber,
  bestFitness,
  avgFitness,
  hasPopulation,
  autoEvolving,
  speedMultiplier,
  hofCount,
  onInitialize,
  onNextGen,
  onToggleAutoEvolve,
  onSpeedChange,
  onOpenHof,
}: GPControlPanelProps) {
  const canNextGen = phase === 'evaluated' && !autoEvolving;

  return (
    <div
      className="ui-panel"
      style={{
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 16px',
        minWidth: 360,
      }}
    >
      {/* Phase indicator */}
      {phase && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          {PHASES.map((p) => {
            const idx = PHASES.indexOf(p);
            const currentIdx = PHASES.indexOf(phase);
            let cls = 'phase-dot';
            if (idx < currentIdx) cls += ' phase-dot--done';
            else if (idx === currentIdx) cls += ' phase-dot--active';
            return (
              <div key={p} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div className={cls} />
                <span style={{ fontSize: 8, opacity: 0.4 }}>{p}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons row */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
        <button
          className="ui-btn ui-btn--green"
          onClick={onInitialize}
          disabled={hasPopulation}
        >
          Initialize
        </button>
        <button
          className="ui-btn"
          onClick={onNextGen}
          disabled={!canNextGen}
        >
          Next Gen
        </button>
        <button
          className={`ui-btn ui-btn--pink ${autoEvolving ? 'ui-btn--active' : ''}`}
          onClick={onToggleAutoEvolve}
          disabled={!hasPopulation}
        >
          {autoEvolving ? 'Stop' : 'Auto-Evolve'}
        </button>
        <button
          className="ui-btn ui-btn--gold"
          onClick={onOpenHof}
          disabled={hofCount === 0}
        >
          Hall of Fame ({hofCount})
        </button>
      </div>

      {/* Stats + speed row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
        {genNumber != null && (
          <span style={{ opacity: 0.7 }}>
            Gen {genNumber}
            {bestFitness != null && bestFitness >= 0 && (
              <> · Best: <span style={{ color: '#ffd700' }}>{bestFitness.toFixed(4)}</span></>
            )}
            {avgFitness != null && avgFitness >= 0 && (
              <> · Avg: {avgFitness.toFixed(4)}</>
            )}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ opacity: 0.5, fontSize: 10 }}>{speedMultiplier.toFixed(1)}×</span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={speedMultiplier}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            style={{ width: 60, accentColor: '#66ccff' }}
          />
        </div>
      </div>
    </div>
  );
}
