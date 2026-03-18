type CourseRotationOverlayProps = {
  winnerName: string;
  courseVersion: number;
  onContinue: () => void;
};

export default function CourseRotationOverlay({
  winnerName,
  courseVersion,
  onContinue,
}: CourseRotationOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
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
          padding: '32px 48px',
          minWidth: 340,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: '#ffd700',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
            marginBottom: 8,
          }}
        >
          HOLE IN ONE!
        </div>
        <div style={{ fontSize: 16, marginBottom: 4, color: '#e0e8f0' }}>
          <span style={{ color: '#66ccff', fontWeight: 700 }}>{winnerName}</span> conquered Hole #{courseVersion}
        </div>
        <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 24 }}>
          New course incoming...
        </div>
        <button
          className="ui-btn ui-btn--gold"
          style={{ fontSize: 14, padding: '10px 28px' }}
          onClick={onContinue}
        >
          Choose Strategy
        </button>
      </div>
    </div>
  );
}
