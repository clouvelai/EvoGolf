import { useRef, useMemo, useCallback, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { Identity } from 'spacetimedb';

const MAX_BALLS = 128;
const BALL_RADIUS = 0.4;
const SELECTED_SCALE = 1.3;
const OUTLINE_SCALE = 1.2;
const OTHER_SCALE = 0.85;
const BASE_ANIMATION_DURATION = 4.0;

type BallRow = {
  ballId: number;
  genomeId: number;
  genId: number;
  state: string;
  finalX: number;
  finalZ: number;
  playerId: Identity;
};

type BallSwarmProps = {
  selectedGenomeId: number | null;
  onSelectGenome: (genomeId: number | null) => void;
  allBalls: readonly BallRow[];
  myIdentity: Identity | null;
  playerColorMap: Map<string, string>;
  playerNameMap: Map<string, string>;
  speedMultiplier?: number;
};

export default function BallSwarm({
  selectedGenomeId,
  onSelectGenome,
  allBalls,
  myIdentity,
  playerColorMap,
  playerNameMap,
  speedMultiplier = 1,
}: BallSwarmProps) {
  const ANIMATION_DURATION = BASE_ANIMATION_DURATION / speedMultiplier;
  const [hoveredGenomeId, setHoveredGenomeId] = useState<number | null>(null);

  const [genomes] = useTable(tables.genome);
  const [trajectoryPoints] = useTable(tables.trajectoryPoint);

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

  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const outlineMeshRef = useRef<THREE.InstancedMesh>(null!);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);

  const animTimeRef = useRef<Map<number, number>>(new Map());
  const prevPointCountRef = useRef<Map<number, number>>(new Map());

  const ballIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    allBalls.forEach((ball, i) => {
      map.set(i, ball.genomeId);
    });
    return map;
  }, [allBalls]);

  // Track which instances are "mine" for the outline pass
  const myBallIndices = useMemo(() => {
    const indices: number[] = [];
    allBalls.forEach((ball, i) => {
      if (myIdentity && myIdentity.isEqual(ball.playerId)) {
        indices.push(i);
      }
    });
    return indices;
  }, [allBalls, myIdentity]);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    const outlineMesh = outlineMeshRef.current;
    if (!mesh || allBalls.length === 0) {
      if (mesh) mesh.count = 0;
      if (outlineMesh) outlineMesh.count = 0;
      return;
    }

    mesh.count = allBalls.length;

    // Track positions for outline pass
    const myPositions: [number, number, number][] = [];

    allBalls.forEach((ball, i) => {
      const genome = genomeMap.get(ball.genomeId);
      const points = trajectoryMap.get(ball.ballId);
      const isSelected = genome?.genomeId === selectedGenomeId;
      const isMine = myIdentity ? myIdentity.isEqual(ball.playerId) : false;

      const playerHex = ball.playerId.toHexString();
      const playerColor = playerColorMap.get(playerHex) ?? '#66ccff';

      // Animation timing
      const pointCount = points?.length ?? 0;
      const prevCount = prevPointCountRef.current.get(ball.ballId) ?? 0;
      if (pointCount !== prevCount) {
        animTimeRef.current.set(ball.ballId, 0);
        prevPointCountRef.current.set(ball.ballId, pointCount);
      }

      // Fallback: use final position for stopped balls with no trajectory data yet
      let x = ball.state === 'stopped' ? ball.finalX : 0;
      let y = BALL_RADIUS;
      let z = ball.state === 'stopped' ? ball.finalZ : 0;

      if (points && points.length > 0) {
        const t = (animTimeRef.current.get(ball.ballId) ?? 0) + delta;
        animTimeRef.current.set(ball.ballId, t);

        const progress = Math.min(t / ANIMATION_DURATION, 1);
        const floatIdx = progress * (points.length - 1);
        const idx = Math.floor(floatIdx);
        const frac = floatIdx - idx;

        if (idx >= points.length - 1) {
          const last = points[points.length - 1];
          x = last.x; y = last.y; z = last.z;
        } else {
          const a = points[idx];
          const b = points[idx + 1];
          x = a.x + (b.x - a.x) * frac;
          y = a.y + (b.y - a.y) * frac;
          z = a.z + (b.z - a.z) * frac;
        }
      }

      if (y < BALL_RADIUS) y = BALL_RADIUS;

      // Scale: selected > mine > others
      const baseScale = isSelected ? SELECTED_SCALE : (isMine ? 1.0 : OTHER_SCALE);
      tempScale.set(baseScale, baseScale, baseScale);
      tempMatrix.identity();
      tempMatrix.scale(tempScale);
      tempMatrix.setPosition(x, y, z);
      mesh.setMatrixAt(i, tempMatrix);

      // Color with emissive-like brightness for mine
      tempColor.set(playerColor);
      if (!isMine) {
        tempColor.multiplyScalar(0.4);
      }
      if (isSelected) {
        tempColor.offsetHSL(0, 0, 0.15);
      }
      mesh.setColorAt(i, tempColor);

      if (isMine) {
        myPositions.push([x, y, z]);
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Outline pass — render slightly larger outlines behind my balls
    if (outlineMesh && myBallIndices.length > 0) {
      outlineMesh.count = myBallIndices.length;
      myBallIndices.forEach((ballIdx, outlineIdx) => {
        const ball = allBalls[ballIdx];
        const playerHex = ball.playerId.toHexString();
        const playerColor = playerColorMap.get(playerHex) ?? '#66ccff';

        // Get the position from the main mesh
        mesh.getMatrixAt(ballIdx, tempMatrix);
        const pos = new THREE.Vector3();
        pos.setFromMatrixPosition(tempMatrix);

        const genome = genomeMap.get(ball.genomeId);
        const isSelected = genome?.genomeId === selectedGenomeId;
        const s = isSelected ? SELECTED_SCALE * OUTLINE_SCALE : OUTLINE_SCALE;
        tempScale.set(s, s, s);
        tempMatrix.identity();
        tempMatrix.scale(tempScale);
        tempMatrix.setPosition(pos.x, pos.y, pos.z);
        outlineMesh.setMatrixAt(outlineIdx, tempMatrix);

        tempColor.set(playerColor);
        tempColor.multiplyScalar(0.6);
        outlineMesh.setColorAt(outlineIdx, tempColor);
      });
      outlineMesh.instanceMatrix.needsUpdate = true;
      if (outlineMesh.instanceColor) outlineMesh.instanceColor.needsUpdate = true;
    } else if (outlineMesh) {
      outlineMesh.count = 0;
    }
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

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const instanceId = e.instanceId;
      if (instanceId != null) {
        const genomeId = ballIndexMap.get(instanceId) ?? null;
        setHoveredGenomeId(genomeId);
      }
    },
    [ballIndexMap],
  );

  const handlePointerOut = useCallback(() => {
    setHoveredGenomeId(null);
  }, []);

  // Compute hovered ball tooltip data
  const tooltipData = useMemo(() => {
    if (hoveredGenomeId == null) return null;
    const genome = genomeMap.get(hoveredGenomeId);
    if (!genome) return null;
    const ball = allBalls.find(b => b.genomeId === hoveredGenomeId);
    if (!ball) return null;
    const playerHex = ball.playerId.toHexString();
    const playerName = playerNameMap.get(playerHex) ?? 'Unknown';
    const playerColor = playerColorMap.get(playerHex) ?? '#66ccff';
    return { genome, playerName, playerColor };
  }, [hoveredGenomeId, genomeMap, allBalls, playerNameMap, playerColorMap]);

  // Get position of hovered ball for tooltip placement
  const tooltipPosition = useMemo((): [number, number, number] | null => {
    if (hoveredGenomeId == null || !meshRef.current) return null;
    const idx = allBalls.findIndex(b => b.genomeId === hoveredGenomeId);
    if (idx < 0) return null;
    const mat = new THREE.Matrix4();
    meshRef.current.getMatrixAt(idx, mat);
    const pos = new THREE.Vector3();
    pos.setFromMatrixPosition(mat);
    return [pos.x, pos.y + 1.5, pos.z];
  }, [hoveredGenomeId, allBalls]);

  return (
    <group>
      {/* Outline pass — renders behind main balls, BackSide only */}
      <instancedMesh
        ref={outlineMeshRef}
        args={[undefined, undefined, MAX_BALLS]}
        renderOrder={-1}
      >
        <sphereGeometry args={[BALL_RADIUS, 12, 12]} />
        <meshBasicMaterial
          side={THREE.BackSide}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Main balls */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, MAX_BALLS]}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
        <meshStandardMaterial
          transparent
          opacity={0.95}
          roughness={0.3}
          metalness={0.1}
        />
      </instancedMesh>

      {/* Hover tooltip */}
      {tooltipData && tooltipPosition && (
        <Html
          position={tooltipPosition}
          center
          distanceFactor={12}
          sprite
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(8, 24, 40, 0.92)',
            border: `1px solid ${tooltipData.playerColor}55`,
            borderRadius: 6,
            padding: '4px 8px',
            color: '#e0e8f0',
            fontSize: 10,
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, sans-serif',
          }}>
            <div style={{ color: tooltipData.playerColor, fontWeight: 700, marginBottom: 2 }}>
              {tooltipData.playerName}
            </div>
            <div style={{ opacity: 0.7 }}>
              {tooltipData.genome.origin} · Fitness: {tooltipData.genome.fitness < 0 ? '—' : tooltipData.genome.fitness.toFixed(3)}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
