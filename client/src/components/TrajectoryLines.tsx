import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { colorForOrigin } from '../lib/colors';
import { useGenerationData } from '../hooks/useGenerationData';

type TrajectoryLinesProps = {
  selectedGenomeId: number | null;
  currentGenId: number | null;
};

export default function TrajectoryLines({
  selectedGenomeId,
  currentGenId,
}: TrajectoryLinesProps) {
  const { currentBalls, genomeMap, trajectoryMap } = useGenerationData(currentGenId);

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
          lineWidth={line.isSelected ? 4 : 2}
          opacity={line.isSelected ? 1 : 0.6}
          transparent
        />
      ))}
    </group>
  );
}
