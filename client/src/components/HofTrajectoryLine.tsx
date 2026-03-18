import { useMemo } from 'react';
import { Line } from '@react-three/drei';

type TrajectoryPoint = { step: number; x: number; y: number; z: number };

type HofTrajectoryLineProps = {
  trajectoryJson: string;
  isHoleInOne: boolean;
};

export default function HofTrajectoryLine({ trajectoryJson, isHoleInOne }: HofTrajectoryLineProps) {
  const linePoints = useMemo<[number, number, number][]>(() => {
    try {
      const pts: TrajectoryPoint[] = JSON.parse(trajectoryJson);
      return pts.map((p) => [p.x, p.y, p.z] as [number, number, number]);
    } catch {
      return [];
    }
  }, [trajectoryJson]);

  if (linePoints.length < 2) return null;

  return (
    <Line
      points={linePoints}
      color={isHoleInOne ? '#ffd700' : '#66ccff'}
      lineWidth={3}
      opacity={0.8}
      transparent
    />
  );
}
