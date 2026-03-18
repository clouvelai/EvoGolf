import { useMemo } from 'react';
import type { Identity } from 'spacetimedb';

type MinimapBall = {
  ballId: number;
  finalX: number;
  finalZ: number;
  state: string;
  playerId: Identity;
};

type MinimapProps = {
  course: { teeX: number; teeZ: number; holeX: number; holeZ: number } | null;
  allBalls: readonly MinimapBall[];
  myIdentity: Identity | null;
  playerColorMap: Map<string, string>;
};

const MAP_SIZE = 140;
const PADDING = 10;

/**
 * 2D canvas minimap showing bird's-eye view of the course
 * with colored dots for all player balls.
 */
export default function Minimap({ course, allBalls, myIdentity, playerColorMap }: MinimapProps) {
  if (!course) return null;

  // Compute world bounds for mapping
  const bounds = useMemo(() => {
    let minX = Math.min(course.teeX, course.holeX) - 20;
    let maxX = Math.max(course.teeX, course.holeX) + 20;
    let minZ = Math.min(course.teeZ, course.holeZ) - 20;
    let maxZ = Math.max(course.teeZ, course.holeZ) + 20;

    // Include ball positions
    for (const b of allBalls) {
      if (b.state === 'stopped') {
        minX = Math.min(minX, b.finalX - 5);
        maxX = Math.max(maxX, b.finalX + 5);
        minZ = Math.min(minZ, b.finalZ - 5);
        maxZ = Math.max(maxZ, b.finalZ + 5);
      }
    }

    // Ensure square aspect
    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;
    const range = Math.max(rangeX, rangeZ);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    return {
      minX: cx - range / 2,
      maxX: cx + range / 2,
      minZ: cz - range / 2,
      maxZ: cz + range / 2,
      range,
    };
  }, [course, allBalls]);

  const worldToMap = (wx: number, wz: number): [number, number] => {
    const x = PADDING + ((wx - bounds.minX) / bounds.range) * (MAP_SIZE - 2 * PADDING);
    const y = PADDING + ((wz - bounds.minZ) / bounds.range) * (MAP_SIZE - 2 * PADDING);
    return [x, y];
  };

  const [teeMapX, teeMapY] = worldToMap(course.teeX, course.teeZ);
  const [holeMapX, holeMapY] = worldToMap(course.holeX, course.holeZ);

  // Group balls by player for rendering
  const ballDots = useMemo(() => {
    return allBalls
      .filter(b => b.state === 'stopped')
      .map(b => {
        const [x, y] = worldToMap(b.finalX, b.finalZ);
        const pid = b.playerId.toHexString();
        const color = playerColorMap.get(pid) ?? '#66ccff';
        const isMine = myIdentity ? myIdentity.isEqual(b.playerId) : false;
        return { x, y, color, isMine, key: b.ballId };
      });
  }, [allBalls, playerColorMap, myIdentity, bounds]);

  return (
    <div
      className="ui-panel"
      style={{
        position: 'absolute',
        bottom: 200,
        right: 12,
        zIndex: 10,
        width: MAP_SIZE,
        height: MAP_SIZE,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <svg width={MAP_SIZE} height={MAP_SIZE} style={{ display: 'block' }}>
        {/* Water background */}
        <rect width={MAP_SIZE} height={MAP_SIZE} fill="#0d3a50" />

        {/* Island green (approximate circle at hole) */}
        <circle cx={holeMapX} cy={holeMapY} r={12} fill="#1a5c28" opacity={0.8} />
        <circle cx={holeMapX} cy={holeMapY} r={8} fill="#2ca84e" opacity={0.8} />

        {/* Tee box */}
        <rect
          x={teeMapX - 4} y={teeMapY - 3}
          width={8} height={6}
          fill="#2a8545" opacity={0.8}
          rx={1}
        />

        {/* Hole marker */}
        <circle cx={holeMapX} cy={holeMapY} r={2.5} fill="#ffd700" />
        {/* Flag line */}
        <line
          x1={holeMapX} y1={holeMapY}
          x2={holeMapX} y2={holeMapY - 6}
          stroke="#e0e0e0" strokeWidth={0.8}
        />
        <polygon
          points={`${holeMapX},${holeMapY - 6} ${holeMapX + 4},${holeMapY - 4.5} ${holeMapX},${holeMapY - 3}`}
          fill="#e63946"
        />

        {/* Ball dots — others first, mine on top */}
        {ballDots.filter(d => !d.isMine).map(d => (
          <circle
            key={d.key}
            cx={d.x} cy={d.y}
            r={1.5}
            fill={d.color}
            opacity={0.5}
          />
        ))}
        {ballDots.filter(d => d.isMine).map(d => (
          <circle
            key={d.key}
            cx={d.x} cy={d.y}
            r={2.5}
            fill={d.color}
            stroke="white"
            strokeWidth={0.5}
            opacity={0.9}
          />
        ))}

        {/* "MAP" label */}
        <text x={4} y={12} fill="rgba(255,255,255,0.3)" fontSize={8} fontWeight={700}>
          MAP
        </text>
      </svg>
    </div>
  );
}
