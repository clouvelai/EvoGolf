import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import { colorForOrigin } from '../lib/colors';

type TrajectoryLinesProps = {
  selectedGenomeId: number | null;
  currentGenId: number | null;
};

export default function TrajectoryLines({
  selectedGenomeId,
  currentGenId,
}: TrajectoryLinesProps) {
  const [balls] = useTable(tables.golfBall);
  const [genomes] = useTable(tables.genome);
  const [trajectoryPoints] = useTable(tables.trajectoryPoint);

  // Filter balls for current generation
  const currentBalls = useMemo(
    () =>
      currentGenId != null
        ? balls.filter((b) => b.genId === currentGenId)
        : [],
    [balls, currentGenId],
  );

  // Build genome lookup by genomeId
  const genomeMap = useMemo(() => {
    const map = new Map<number, (typeof genomes)[number]>();
    for (const g of genomes) {
      map.set(g.genomeId, g);
    }
    return map;
  }, [genomes]);

  // Build trajectory lookup: ballId -> sorted points
  const trajectoryMap = useMemo(() => {
    const map = new Map<
      number,
      { step: number; x: number; y: number; z: number }[]
    >();
    for (const p of trajectoryPoints) {
      let arr = map.get(p.ballId);
      if (!arr) {
        arr = [];
        map.set(p.ballId, arr);
      }
      arr.push(p);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.step - b.step);
    }
    return map;
  }, [trajectoryPoints]);

  // Build line data for each ball
  const lines = useMemo(() => {
    return currentBalls
      .map((ball) => {
        const genome = genomeMap.get(ball.genomeId);
        const points = trajectoryMap.get(ball.ballId);
        if (!points || points.length < 2) return null;

        const origin = genome?.origin ?? 'random';
        const isSelected = genome?.genomeId === selectedGenomeId;
        const color = colorForOrigin(origin);
        const linePoints = points.map(
          (p) => [p.x, p.y, p.z] as [number, number, number],
        );

        return {
          key: ball.ballId,
          points: linePoints,
          color,
          isSelected,
        };
      })
      .filter(
        (
          line,
        ): line is {
          key: number;
          points: [number, number, number][];
          color: string;
          isSelected: boolean;
        } => line !== null,
      );
  }, [currentBalls, genomeMap, trajectoryMap, selectedGenomeId]);

  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          color={line.color}
          lineWidth={line.isSelected ? 3 : 1}
          opacity={line.isSelected ? 1 : 0.3}
          transparent
        />
      ))}
    </group>
  );
}
