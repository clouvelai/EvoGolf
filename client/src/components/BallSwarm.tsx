import { useRef, useMemo, useCallback } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { colorForOrigin } from '../lib/colors';
import { useGenerationData } from '../hooks/useGenerationData';

const MAX_BALLS = 64;
const BALL_RADIUS = 0.4;
const SELECTED_SCALE = 1.3;
const ANIMATION_DURATION = 4.0;

type BallSwarmProps = {
  selectedGenomeId: number | null;
  onSelectGenome: (genomeId: number | null) => void;
  currentGenId: number | null;
};

export default function BallSwarm({
  selectedGenomeId,
  onSelectGenome,
  currentGenId,
}: BallSwarmProps) {
  const { currentBalls, genomeMap, trajectoryMap } = useGenerationData(currentGenId);

  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);

  // Animation time tracking per ball (by ballId)
  const animTimeRef = useRef<Map<number, number>>(new Map());
  const prevPointCountRef = useRef<Map<number, number>>(new Map());

  // Build ballId -> index mapping for raycasting
  const ballIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    currentBalls.forEach((ball, i) => {
      map.set(i, ball.genomeId);
    });
    return map;
  }, [currentBalls]);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || currentBalls.length === 0) {
      // Hide all instances when no balls
      if (mesh) {
        mesh.count = 0;
      }
      return;
    }

    mesh.count = currentBalls.length;

    currentBalls.forEach((ball, i) => {
      const genome = genomeMap.get(ball.genomeId);
      const points = trajectoryMap.get(ball.ballId);
      const origin = genome?.origin ?? 'random';
      const isSelected = genome?.genomeId === selectedGenomeId;

      // Animation timing
      const pointCount = points?.length ?? 0;
      const prevCount = prevPointCountRef.current.get(ball.ballId) ?? 0;
      if (pointCount !== prevCount) {
        animTimeRef.current.set(ball.ballId, 0);
        prevPointCountRef.current.set(ball.ballId, pointCount);
      }

      let x = 0;
      let y = BALL_RADIUS;
      let z = 0;

      if (points && points.length > 0) {
        // Advance animation time
        const t = (animTimeRef.current.get(ball.ballId) ?? 0) + delta;
        animTimeRef.current.set(ball.ballId, t);

        const progress = Math.min(t / ANIMATION_DURATION, 1);
        const floatIdx = progress * (points.length - 1);
        const idx = Math.floor(floatIdx);
        const frac = floatIdx - idx;

        if (idx >= points.length - 1) {
          const last = points[points.length - 1];
          x = last.x;
          y = last.y;
          z = last.z;
        } else {
          const a = points[idx];
          const b = points[idx + 1];
          x = a.x + (b.x - a.x) * frac;
          y = a.y + (b.y - a.y) * frac;
          z = a.z + (b.z - a.z) * frac;
        }
      }

      // Ensure ball is above ground
      if (y < BALL_RADIUS) y = BALL_RADIUS;

      const scale = isSelected ? SELECTED_SCALE : 1;
      tempScale.set(scale, scale, scale);
      tempMatrix.identity();
      tempMatrix.scale(tempScale);
      tempMatrix.setPosition(x, y, z);
      mesh.setMatrixAt(i, tempMatrix);

      tempColor.set(colorForOrigin(origin));
      mesh.setColorAt(i, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const instanceId = e.instanceId;
      if (instanceId != null) {
        const genomeId = ballIndexMap.get(instanceId) ?? null;
        onSelectGenome(genomeId);
      }
    },
    [ballIndexMap, onSelectGenome],
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_BALLS]}
      onPointerDown={handlePointerDown}
    >
      <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
