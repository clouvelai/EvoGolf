type GPControlPanelProps = {
  phase: string | null;
  genNumber: number | null;
  hasPopulation: boolean;
  autoEvolving: boolean;
  speedMultiplier: number;
  hofCount: number;
  followMode: boolean;
  showMySwarm: boolean;
  viewMode: 'tee' | 'green';
  onInitialize: () => void;
  onNextGen: () => void;
  onToggleAutoEvolve: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenHof: () => void;
  onToggleFollow: () => void;
  onToggleSwarm: () => void;
  onToggleView: () => void;
};

function statusText(phase: string | null): string {
  switch (phase) {
    case 'simulating': return 'Balls in the air...';
    case 'selecting':
    case 'breeding': return 'Evolving new swings...';
    case 'evaluated': return 'Ready';
    case 'complete': return 'Done';
    case 'init': return 'Initializing...';
    default: return '';
  }
}

export default function GPControlPanel({
  phase,
  genNumber,
  hasPopulation,
  autoEvolving,
  speedMultiplier,
  hofCount,
  followMode,
  showMySwarm,
  viewMode,
  onInitialize,
  onNextGen,
  onToggleAutoEvolve,
  onSpeedChange,
  onOpenHof,
  onToggleFollow,
  onToggleSwarm,
  onToggleView,
}: GPControlPanelProps) {
  const canNextGen = phase === 'evaluated' && !autoEvolving;
  const status = statusText(phase);

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
        minWidth: 420,
      }}
    >
      {/* Status text */}
      {status && (
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          opacity: 0.6,
          fontStyle: 'italic',
        }}>
          {status}
        </div>
      )}

      {/* Action buttons row */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className="ui-btn ui-btn--green"
          onClick={onInitialize}
          disabled={hasPopulation}
        >
          Tee Off
        </button>
        <button
          className="ui-btn"
          onClick={onNextGen}
          disabled={!canNextGen}
        >
          Evolve
        </button>
        <button
          className={`ui-btn ui-btn--pink ${autoEvolving ? 'ui-btn--active' : ''}`}
          onClick={onToggleAutoEvolve}
          disabled={!hasPopulation}
        >
          {autoEvolving ? 'Pause' : 'Auto'}
        </button>
        <button
          className={`ui-btn ${followMode ? 'ui-btn--active' : ''}`}
          onClick={onToggleFollow}
          disabled={!hasPopulation}
          style={{ borderColor: followMode ? 'rgba(102, 204, 255, 0.6)' : undefined }}
          title="Camera follows best ball"
        >
          {followMode ? 'Free Cam' : 'Follow'}
        </button>
        <button
          className={`ui-btn ${viewMode === 'green' ? 'ui-btn--active ui-btn--green' : ''}`}
          onClick={onToggleView}
          title={viewMode === 'tee' ? 'Switch to green view' : 'Switch to tee view'}
        >
          {viewMode === 'tee' ? 'Green View' : 'Tee View'}
        </button>
        <button
          className={`ui-btn ${showMySwarm ? 'ui-btn--active' : ''}`}
          onClick={onToggleSwarm}
          disabled={!hasPopulation}
          title={showMySwarm ? 'Show only best ball per player' : 'Show all your balls'}
        >
          {showMySwarm ? 'Best Only' : 'All Balls'}
        </button>
        <button
          className="ui-btn ui-btn--gold"
          onClick={onOpenHof}
          disabled={hofCount === 0}
        >
          Hall of Fame ({hofCount})
        </button>
      </div>

      {/* Speed slider row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
        {genNumber != null && (
          <span style={{ opacity: 0.5, fontSize: 10 }}>Gen {genNumber}</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ opacity: 0.5, fontSize: 10 }}>{speedMultiplier.toFixed(1)}x</span>
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
