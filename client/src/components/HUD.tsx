type HUDProps = {
  par: number;
  distance: number;
  windX: number;
  windZ: number;
  genNumber: number | null;
  bestDistance: number | null;
  courseVersion: number;
  playerCount: number;
};

export default function HUD({
  par, distance, windX, windZ, genNumber, bestDistance,
  courseVersion, playerCount,
}: HUDProps) {
  const isClose = bestDistance != null && bestDistance < 5;
  return (
    <div
      className="ui-panel"
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        padding: '8px 20px',
        whiteSpace: 'nowrap',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#ffd700', fontWeight: 700 }}>Hole #{courseVersion}</span>
      <span>PAR {par}</span>
      <span>{Math.round(distance)} YDS</span>
      <span style={{ opacity: 0.7 }}>Wind {windX.toFixed(1)},{windZ.toFixed(1)}</span>
      {genNumber != null && <span>Gen {genNumber}</span>}
      {bestDistance != null && (
        <span style={{ color: isClose ? '#ffd700' : '#e0e8f0', fontWeight: isClose ? 700 : 400 }}>
          Best: {bestDistance.toFixed(1)} yds
        </span>
      )}
      <span style={{ opacity: 0.5, fontSize: 11 }}>
        {playerCount} player{playerCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
