import { useMemo } from 'react';
import type { Identity } from 'spacetimedb';

type PlayerRow = {
  identity: Identity;
  name: string;
  color: string;
};

type GenerationRow = {
  genId: number;
  genNumber: number;
  bestFitness: number;
  playerId: Identity;
};

type PlayerListProps = {
  players: readonly PlayerRow[];
  generations: readonly GenerationRow[];
  myIdentity: Identity | null;
  isMyIdentity: (id: any) => boolean;
};

export default function PlayerList({ players, generations, myIdentity: _myIdentity, isMyIdentity }: PlayerListProps) {
  const playerData = useMemo(() => {
    return players.map((p) => {
      const isMe = isMyIdentity(p.identity);
      // Find latest generation for this player
      let latestGen: GenerationRow | null = null;
      for (const gen of generations) {
        if (p.identity.isEqual(gen.playerId)) {
          if (!latestGen || gen.genNumber > latestGen.genNumber) {
            latestGen = gen;
          }
        }
      }
      return {
        name: p.name,
        color: p.color,
        isMe,
        genNumber: latestGen?.genNumber ?? null,
        bestFitness: latestGen?.bestFitness ?? null,
      };
    }).sort((a, b) => {
      // Me first, then by gen number descending
      if (a.isMe && !b.isMe) return -1;
      if (!a.isMe && b.isMe) return 1;
      return (b.genNumber ?? 0) - (a.genNumber ?? 0);
    });
  }, [players, generations, isMyIdentity]);

  if (players.length === 0) return null;

  return (
    <div
      className="ui-panel"
      style={{
        position: 'absolute',
        top: 60,
        left: 12,
        zIndex: 10,
        minWidth: 160,
        padding: '8px 10px',
      }}
    >
      <div className="ui-panel-header">Players</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {playerData.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              opacity: p.isMe ? 1 : 0.7,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: p.color,
                flexShrink: 0,
                boxShadow: p.isMe ? `0 0 6px ${p.color}` : 'none',
              }}
            />
            <span style={{ flex: 1, fontWeight: p.isMe ? 700 : 400 }}>
              {p.name}{p.isMe ? ' (you)' : ''}
            </span>
            {p.genNumber != null && (
              <span style={{ opacity: 0.5, fontSize: 10 }}>
                G{p.genNumber}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
