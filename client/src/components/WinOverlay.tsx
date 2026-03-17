type WinOverlayProps = {
  genNumber: number;
  onPlayAgain: () => void;
};

export default function WinOverlay({ genNumber, onPlayAgain }: WinOverlayProps) {
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
          padding: '32px 48px',
          minWidth: 300,
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
        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 24 }}>
          Evolved in {genNumber} generation{genNumber !== 1 ? 's' : ''}
        </div>
        <button
          className="ui-btn ui-btn--gold"
          style={{ fontSize: 14, padding: '8px 24px' }}
          onClick={onPlayAgain}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
