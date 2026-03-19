import { useRef, useEffect, useState } from 'react';

type GpEventRow = {
  eventId: number;
  genId: number;
  eventType: string;
  description: string;
};

const EVENT_COLORS: Record<string, string> = {
  init: '#66ccff',
  simulate: '#44ffaa',
  select: '#ffd700',
  crossover: '#44ffaa',
  mutate: '#ff55aa',
  replicate: '#ffd700',
  elite_mutate: '#ffaa44',
  elite_crossover: '#aaff44',
};

type EventLogProps = {
  events: GpEventRow[];
};

export default function EventLog({ events }: EventLogProps) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && open) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, open]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 10,
      }}
    >
      {!open ? (
        <button
          className="ui-btn"
          onClick={() => setOpen(true)}
          style={{ fontSize: 11, padding: '4px 10px' }}
        >
          Log ({events.length})
        </button>
      ) : (
        <div className="ui-panel" style={{ width: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="ui-panel-header" style={{ marginBottom: 0 }}>Event Log</span>
            <button
              className="ui-btn"
              onClick={() => setOpen(false)}
              style={{ fontSize: 10, padding: '2px 6px' }}
            >
              ×
            </button>
          </div>
          <div
            ref={scrollRef}
            className="ui-scroll"
            style={{ maxHeight: 200, overflowY: 'auto' }}
          >
            {events.map((e) => (
              <div
                key={e.eventId}
                style={{
                  fontSize: 11,
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(102,204,255,0.06)',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: EVENT_COLORS[e.eventType] ?? '#66ccff',
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
                <span style={{ opacity: 0.85 }}>{e.description}</span>
              </div>
            ))}
            {events.length === 0 && (
              <div style={{ opacity: 0.4, fontSize: 11, textAlign: 'center', padding: 12 }}>
                No events yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
