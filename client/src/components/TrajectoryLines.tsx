import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { Identity } from 'spacetimedb';

type BallRow = {
  ballId: number;
  genomeId: number;
  genId: number;
  playerId: Identity;
  distanceToHole: number;
  state: string;
};

type TrajectoryLinesProps = {
  selectedGenomeId: number | null;
  allBalls: readonly BallRow[];
  myIdentity: Identity | null;
  playerColorMap: Map<string, string>;
};

export default function TrajectoryLines({
  selectedGenomeId,
  allBalls,
  myIdentity,
  playerColorMap,
}: TrajectoryLinesProps) {
  const [genomes] = useTable(tables.genome);
  const [trajectoryPoints] = useTable(tables.trajectoryPoint);
  const [allGolfBalls] = useTable(tables.golfBall);

  const genomeMap = useMemo(() => {
    const map = new Map<number, (typeof genomes)[number]>();
    for (const g of genomes) map.set(g.genomeId, g);
    return map;
  }, [genomes]);

  const trajectoryMap = useMemo(() => {
    const map = new Map<number, { step: number; x: number; y: number; z: number }[]>();
    for (const p of trajectoryPoints) {
      let arr = map.get(p.ballId);
      if (!arr) { arr = []; map.set(p.ballId, arr); }
      arr.push(p);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.step - b.step);
    return map;
  }, [trajectoryPoints]);

  // Find the best ball per opponent that actually has trajectory data.
  // allBalls (from props) only has the latest gen, which may not have trajectory
  // data yet due to subscription timing. Fall back to any gen's balls via allGolfBalls.
  const opponentBestBallIds = useMemo(() => {
    type Pick = { ballId: number; distanceToHole: number };
    const bestByPlayer = new Map<string, Pick>();

    // First pass: try allBalls (latest gen) — prefer balls with trajectory data
    for (const ball of allBalls) {
      if (myIdentity && myIdentity.isEqual(ball.playerId)) continue;
      if (ball.state !== 'stopped') continue;
      if (!trajectoryMap.has(ball.ballId)) continue;
      const pid = ball.playerId.toHexString();
      const existing = bestByPlayer.get(pid);
      if (!existing || ball.distanceToHole < existing.distanceToHole) {
        bestByPlayer.set(pid, { ballId: ball.ballId, distanceToHole: ball.distanceToHole });
      }
    }

    // Second pass: for opponents with no result yet, search ALL balls for any
    // stopped ball with trajectory data (covers previous gen during timing gap)
    const opponentIds = new Set<string>();
    for (const ball of allBalls) {
      if (myIdentity && myIdentity.isEqual(ball.playerId)) continue;
      opponentIds.add(ball.playerId.toHexString());
    }
    for (const pid of opponentIds) {
      if (bestByPlayer.has(pid)) continue;
      for (const ball of allGolfBalls) {
        if (ball.playerId.toHexString() !== pid) continue;
        if (ball.state !== 'stopped') continue;
        if (!trajectoryMap.has(ball.ballId)) continue;
        const existing = bestByPlayer.get(pid);
        if (!existing || ball.distanceToHole < existing.distanceToHole) {
          bestByPlayer.set(pid, { ballId: ball.ballId, distanceToHole: ball.distanceToHole });
        }
      }
    }

    return new Set(Array.from(bestByPlayer.values()).map(b => b.ballId));
  }, [allBalls, allGolfBalls, myIdentity, trajectoryMap]);

  // Merge allBalls with any fallback opponent balls not already present
  const renderBalls = useMemo(() => {
    const seen = new Set(allBalls.map(b => b.ballId));
    const extra = allGolfBalls.filter(b => opponentBestBallIds.has(b.ballId) && !seen.has(b.ballId));
    return [...allBalls, ...extra];
  }, [allBalls, allGolfBalls, opponentBestBallIds]);

  const lines = useMemo(() => {
    return renderBalls
      .map((ball) => {
        const genome = genomeMap.get(ball.genomeId);
        const points = trajectoryMap.get(ball.ballId);
        if (!points || points.length < 2) return null;

        const isSelected = genome?.genomeId === selectedGenomeId;
        const isMine = myIdentity ? myIdentity.isEqual(ball.playerId) : false;
        const isOpponentBest = opponentBestBallIds.has(ball.ballId);

        // Filter: show my lines, selected line, and opponent best lines only
        if (!isMine && !isSelected && !isOpponentBest) return null;

        const playerHex = ball.playerId.toHexString();
        const color = playerColorMap.get(playerHex) ?? '#66ccff';

        const linePoints = points.map(
          (p) => [p.x, p.y, p.z] as [number, number, number],
        );

        return {
          key: ball.ballId,
          points: linePoints,
          color,
          isSelected,
          isMine,
          isOpponentBest,
        };
      })
      .filter(
        (line): line is NonNullable<typeof line> => line !== null,
      );
  }, [renderBalls, genomeMap, trajectoryMap, selectedGenomeId, myIdentity, playerColorMap, opponentBestBallIds]);

  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          color={line.color}
          lineWidth={line.isSelected ? 4 : line.isMine ? 1.5 : 1.5}
          opacity={line.isSelected ? 1 : line.isMine ? 0.5 : 0.4}
          transparent
          dashed={!line.isMine && !line.isSelected}
          dashScale={line.isOpponentBest ? 3 : 1}
          dashSize={line.isOpponentBest ? 2 : 1}
          gapSize={line.isOpponentBest ? 1.5 : 0}
        />
      ))}
    </group>
  );
}
