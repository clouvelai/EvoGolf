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

type BallRow = {
  ballId: number;
  genId: number;
  state: string;
  distanceToHole: number;
  playerId: Identity;
};

type PlayerListProps = {
  players: readonly PlayerRow[];
  generations: readonly GenerationRow[];
  myIdentity: Identity | null;
  isMyIdentity: (id: any) => boolean;
  allBalls: readonly BallRow[];
  onSelectPlayer?: (identity: Identity) => void;
  selectedPlayerId?: string | null;
};

export default function PlayerList({ players, generations, myIdentity: _myIdentity, isMyIdentity, allBalls, onSelectPlayer, selectedPlayerId }: PlayerListProps) {
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
      // Find best stopped ball distance across all balls for this player
      let bestDistance: number | null = null;
      for (const ball of allBalls) {
        if (!p.identity.isEqual(ball.playerId)) continue;
        if (ball.state !== 'stopped') continue;
        if (bestDistance === null || ball.distanceToHole < bestDistance) {
          bestDistance = ball.distanceToHole;
        }
      }
      return {
        identity: p.identity,
        name: p.name,
        color: p.color,
        isMe,
        genNumber: latestGen?.genNumber ?? null,
        bestDistance,
      };
    }).sort((a, b) => {
      // Sort by distance ascending (closest first), null distances last
      if (a.bestDistance == null && b.bestDistance == null) return 0;
      if (a.bestDistance == null) return 1;
      if (b.bestDistance == null) return -1;
      return a.bestDistance - b.bestDistance;
    });
  }, [players, generations, isMyIdentity, allBalls]);

  if (players.length === 0) return null;

  return (
    <div
      className="ui-panel"
      style={{
        position: 'absolute',
        top: 60,
        left: 12,
        zIndex: 10,
        minWidth: 200,
        padding: '8px 10px',
      }}
    >
      <div className="ui-panel-header">Leaderboard</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {playerData.map((p, i) => {
          const rank = i + 1;
          const isLeader = rank === 1 && p.bestDistance != null;
          const isInspected = selectedPlayerId != null && p.identity.toHexString() === selectedPlayerId;
          const distColor = p.bestDistance == null ? 'rgba(128,144,160,0.5)'
            : p.bestDistance < 5 ? '#ffd700'
            : p.bestDistance < 20 ? '#e0e8f0'
            : 'rgba(128,144,160,0.7)';

          return (
            <div
              key={i}
              onClick={() => onSelectPlayer?.(p.identity)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                padding: '2px 4px',
                borderRadius: 4,
                borderLeft: isLeader ? '2px solid #ffd700' : '2px solid transparent',
                cursor: onSelectPlayer ? 'pointer' : 'default',
                background: isInspected ? 'rgba(102,204,255,0.15)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (onSelectPlayer && !isInspected) e.currentTarget.style.background = 'rgba(102,204,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isInspected ? 'rgba(102,204,255,0.15)' : 'transparent';
              }}
            >
              <span style={{
                width: 16,
                textAlign: 'right',
                fontWeight: 700,
                color: isLeader ? '#ffd700' : 'rgba(128,144,160,0.6)',
                fontSize: 10,
              }}>
                #{rank}
              </span>
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
              <span style={{
                flex: 1,
                fontWeight: p.isMe ? 700 : 400,
                color: isLeader ? '#ffd700' : '#e0e8f0',
              }}>
                {p.name}{p.isMe ? ' (you)' : ''}
              </span>
              <span style={{ color: distColor, fontWeight: 600, fontSize: 11 }}>
                {p.bestDistance != null ? `${p.bestDistance.toFixed(1)} yds` : '---'}
              </span>
              {p.genNumber != null && (
                <span style={{ opacity: 0.3, fontSize: 9 }}>
                  G{p.genNumber}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
