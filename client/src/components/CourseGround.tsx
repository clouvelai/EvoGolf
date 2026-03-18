import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';

type GolfCourse = {
  holeId: number; par: number;
  teeX: number; teeZ: number;
  holeX: number; holeZ: number;
  distance: number; windX: number; windZ: number;
  courseVersion: number;
} | null;

/**
 * Parametric blob shape — organic ellipse with harmonic wobble.
 * Returns a flat ShapeGeometry in XY plane (rotate -PI/2 to lay flat).
 */
function blobGeo(rx: number, ry: number, wobbleX: number, wobbleY: number, segments = 48) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const r1 = rx + wobbleX * Math.sin(a * 2) + wobbleX * 0.5 * Math.cos(a * 3);
    const r2 = ry + wobbleY * Math.cos(a * 2) + wobbleY * 0.4 * Math.sin(a * 3);
    const x = r1 * Math.cos(a);
    const y = r2 * Math.sin(a);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return new THREE.ShapeGeometry(shape);
}

/** Ring geometry for water ripple effects */
function ringGeo(innerR: number, outerR: number, segments = 48) {
  const shape = new THREE.Shape();
  // Outer circle
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = outerR * Math.cos(a);
    const y = outerR * Math.sin(a);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  // Inner circle (hole)
  const hole = new THREE.Path();
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = innerR * Math.cos(a);
    const y = innerR * Math.sin(a);
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape);
}

export default function CourseGround({ course }: { course: GolfCourse }) {
  const teeX = course?.teeX ?? 0;
  const teeZ = course?.teeZ ?? 0;
  const holeX = course?.holeX ?? 0;
  const holeZ = course?.holeZ ?? 137;

  // Animated water refs
  const waterShimmerRef = useRef<THREE.MeshStandardMaterial>(null!);
  const ripple1Ref = useRef<THREE.MeshStandardMaterial>(null!);
  const ripple2Ref = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Subtle water shimmer — oscillate opacity and slight color shift
    if (waterShimmerRef.current) {
      waterShimmerRef.current.opacity = 0.25 + 0.12 * Math.sin(t * 0.8);
    }
    // Ripple rings pulse
    if (ripple1Ref.current) {
      ripple1Ref.current.opacity = 0.12 + 0.08 * Math.sin(t * 1.2);
    }
    if (ripple2Ref.current) {
      ripple2Ref.current.opacity = 0.08 + 0.06 * Math.sin(t * 0.9 + 1.5);
    }
  });

  // Mainland: organic coastline around tee area
  const mainlandGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-60, -50);
    s.lineTo(60, -50);
    s.lineTo(50, -8);
    s.quadraticCurveTo(30, 8, 10, 14);
    s.quadraticCurveTo(0, 17, -10, 14);
    s.quadraticCurveTo(-25, 8, -40, -2);
    s.lineTo(-60, -20);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);

  // Far shore behind the green
  const farShoreGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-80, 158);
    s.quadraticCurveTo(-30, 152, 0, 155);
    s.quadraticCurveTo(30, 150, 80, 158);
    s.lineTo(80, 220);
    s.lineTo(-80, 220);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);

  // Island & green shapes
  const islandGeo = useMemo(() => blobGeo(9, 13, 1.5, 2), []);
  const greenGeo = useMemo(() => blobGeo(7, 10, 1, 1.5), []);

  // Ripple rings around island
  const rippleGeo1 = useMemo(() => ringGeo(14, 15, 48), []);
  const rippleGeo2 = useMemo(() => ringGeo(17, 17.8, 48), []);

  // Cart path shape — curved path from tee area toward shore edge
  const cartPathGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.6, -16);
    s.quadraticCurveTo(-1.2, -5, -1.8, 5);
    s.lineTo(-0.8, 5);
    s.quadraticCurveTo(-0.2, -5, 0.4, -16);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);

  // Tree data: [x, z, height, type] — deterministic, 0=pine, 1=round, 2=tall pine
  const teeTrees: [number, number, number, number][] = [
    [-18, -10, 5.5, 0], [-26, -18, 6.5, 1], [16, -14, 5, 0],
    [24, -7, 4.5, 2], [-34, -2, 6, 1], [-14, -22, 4.5, 0],
    [8, -20, 5, 2], [-8, -28, 6, 1], [30, -16, 5.5, 0],
    [-42, -12, 5, 1], [38, -22, 4, 2], [-20, -32, 5.5, 0],
  ];
  const farTrees: [number, number, number, number][] = [
    [-25, 160, 4.5, 1], [-5, 156, 5.5, 0], [12, 157, 5, 2],
    [30, 162, 4, 1], [-45, 164, 5, 0], [45, 165, 3.5, 2],
    [-60, 168, 4, 1], [60, 170, 3.5, 0], [0, 162, 4.5, 1],
  ];

  return (
    <group>
      {/* ====== SKY DOME — gradient from horizon to zenith ====== */}
      <mesh position={[0, 0, 70]}>
        <sphereGeometry args={[250, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#0a1e38" side={THREE.BackSide} />
      </mesh>
      {/* Horizon glow band */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 70]}>
        <ringGeometry args={[180, 250, 48]} />
        <meshBasicMaterial color="#122a45" side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>

      {/* ====== WATER ====== */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 80]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#1a7a9a" roughness={0.06} metalness={0.55} />
      </mesh>
      {/* Water shimmer layer — animated */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 80]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial
          ref={waterShimmerRef}
          color="#30b8dd"
          transparent
          opacity={0.3}
          roughness={0.01}
          metalness={0.8}
        />
      </mesh>

      {/* ====== MAINLAND (tee side) ====== */}
      <mesh geometry={mainlandGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1a5c28" roughness={0.85} />
      </mesh>
      {/* Shoreline edge — sand strip below grass */}
      <mesh geometry={mainlandGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} scale={[1.015, 1.015, 1]}>
        <meshStandardMaterial color="#c4a862" roughness={0.9} />
      </mesh>

      {/* Fairway strip leading to tee */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -5]}>
        <planeGeometry args={[14, 22]} />
        <meshStandardMaterial color="#1e6a30" roughness={0.7} />
      </mesh>
      {/* Rough patches on mainland for texture variation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-22, 0.005, -8]}>
        <circleGeometry args={[8, 16]} />
        <meshStandardMaterial color="#175225" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, 0.005, -12]}>
        <circleGeometry args={[6, 16]} />
        <meshStandardMaterial color="#165020" roughness={0.95} />
      </mesh>

      {/* Cart path */}
      <mesh geometry={cartPathGeo} rotation={[-Math.PI / 2, 0, 0]} position={[6, 0.02, 0]}>
        <meshStandardMaterial color="#8a8070" roughness={0.95} />
      </mesh>

      {/* ====== FAR SHORE ====== */}
      <mesh geometry={farShoreGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#14502a" roughness={0.9} />
      </mesh>
      {/* Far shore sand edge */}
      <mesh geometry={farShoreGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} scale={[1.01, 1, 1]}>
        <meshStandardMaterial color="#b09850" roughness={0.9} />
      </mesh>

      {/* ====== TEE BOX ====== */}
      <group position={[teeX, 0.06, teeZ]}>
        {/* Tee box surround */}
        <mesh position={[0, -0.03, 0]}>
          <boxGeometry args={[6.5, 0.08, 5.5]} />
          <meshStandardMaterial color="#1e7538" roughness={0.6} />
        </mesh>
        {/* Tee box surface */}
        <mesh>
          <boxGeometry args={[5, 0.1, 4]} />
          <meshStandardMaterial color="#2a8545" roughness={0.4} />
        </mesh>
        {/* Tee markers */}
        <mesh position={[-2, 0.2, -1.5]}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color="#cc2233" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[2, 0.2, -1.5]}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color="#cc2233" roughness={0.3} metalness={0.1} />
        </mesh>
      </group>

      {/* ====== ISLAND GREEN ====== */}
      <group position={[holeX, 0, holeZ]}>
        {/* Ripple rings in water around island — animated */}
        <mesh geometry={rippleGeo1} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
          <meshStandardMaterial
            ref={ripple1Ref}
            color="#50d0e8"
            transparent
            opacity={0.15}
            roughness={0.01}
            metalness={0.6}
          />
        </mesh>
        <mesh geometry={rippleGeo2} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]}>
          <meshStandardMaterial
            ref={ripple2Ref}
            color="#40c0d8"
            transparent
            opacity={0.1}
            roughness={0.01}
            metalness={0.6}
          />
        </mesh>

        {/* Bulkhead retaining wall (brown border, slightly larger, lower) */}
        <mesh geometry={islandGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <meshStandardMaterial color="#4a2e14" roughness={0.95} />
        </mesh>
        {/* Bulkhead vertical edge effect */}
        <mesh geometry={islandGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
          <meshStandardMaterial color="#3a2210" roughness={1} />
        </mesh>

        {/* Island rough/fringe */}
        <mesh geometry={islandGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} scale={[0.88, 0.88, 1]}>
          <meshStandardMaterial color="#1a6830" roughness={0.8} />
        </mesh>

        {/* Putting green */}
        <mesh geometry={greenGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#2ca84e" roughness={0.35} />
        </mesh>

        {/* Bunker lip (dark edge — rendered below sand) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.5, 0.065, 8]}>
          <circleGeometry args={[3.1, 24]} />
          <meshStandardMaterial color="#1a5c28" roughness={0.9} />
        </mesh>
        {/* Bunker sand (on top of lip) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.5, 0.07, 8]}>
          <circleGeometry args={[2.8, 24]} />
          <meshStandardMaterial color="#dcc87a" roughness={0.9} />
        </mesh>

        {/* Hole */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
          <circleGeometry args={[0.35, 20]} />
          <meshStandardMaterial color="#111" />
        </mesh>

        {/* Flag pole — slight lean for realism */}
        <mesh position={[0.05, 2.2, 0]} rotation={[0, 0, 0.02]}>
          <cylinderGeometry args={[0.04, 0.04, 4.2, 8]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.5} roughness={0.2} />
        </mesh>
        {/* Flag */}
        <mesh position={[0.75, 4, 0]} rotation={[0, 0, 0.05]}>
          <planeGeometry args={[1.3, 0.8]} />
          <meshStandardMaterial color="#e63946" side={THREE.DoubleSide} />
        </mesh>

        {/* Small spectator mound (behind green) */}
        <mesh position={[6, 0.15, -8]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3, 16]} />
          <meshStandardMaterial color="#1a6830" roughness={0.85} />
        </mesh>
      </group>

      {/* ====== TREES — TEE SIDE ====== */}
      {teeTrees.map(([tx, tz, h, type], i) => (
        <Tree key={`t${i}`} position={[tx, 0, tz]} height={h} shade={i % 3} type={type} />
      ))}

      {/* ====== TREES — FAR SHORE ====== */}
      {farTrees.map(([tx, tz, h, type], i) => (
        <Tree key={`f${i}`} position={[tx, 0, tz]} height={h} shade={(i + 1) % 3} type={type} />
      ))}

      {/* ====== YARDAGE MARKER ====== */}
      <Billboard position={[18, 1.5, 75]}>
        <Text
          fontSize={2.2}
          color="#ffffff"
          anchorX="center"
          outlineWidth={0.12}
          outlineColor="#000000"
          font={undefined}
        >
          {Math.round(course?.distance ?? 137)} YDS
        </Text>
      </Billboard>

      {/* Hole label floating above pin */}
      <Billboard position={[holeX + 3, 6.5, holeZ]}>
        <Text
          fontSize={1.5}
          color="#ffd700"
          anchorX="center"
          outlineWidth={0.08}
          outlineColor="#000000"
        >
          #{course?.courseVersion ?? 1}
        </Text>
      </Billboard>

      {/* Par label */}
      <Billboard position={[holeX + 3, 5, holeZ]}>
        <Text
          fontSize={1}
          color="#ffffff"
          anchorX="center"
          outlineWidth={0.06}
          outlineColor="#000000"
        >
          PAR 3
        </Text>
      </Billboard>
    </group>
  );
}

/** Stylized tree with type variation: 0=pine (cone), 1=round (sphere), 2=tall pine (multi-cone) */
function Tree({ position, height, shade, type }: {
  position: number[]; height: number; shade: number; type: number;
}) {
  const trunkH = height * 0.35;
  const canopyR = height * 0.4;
  const colors = ['#1a6030', '#1f7035', '#1b6530'];
  const color = colors[shade];

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Trunk */}
      <mesh position={[0, trunkH / 2, 0]}>
        <cylinderGeometry args={[0.15, 0.3, trunkH, 6]} />
        <meshStandardMaterial color="#4a3526" roughness={0.9} />
      </mesh>

      {type === 1 ? (
        /* Round deciduous tree — sphere canopy */
        <mesh position={[0, trunkH + canopyR * 0.7, 0]}>
          <sphereGeometry args={[canopyR * 1.1, 12, 10]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ) : type === 2 ? (
        /* Tall pine — two stacked cones */
        <>
          <mesh position={[0, trunkH + height * 0.25, 0]}>
            <coneGeometry args={[canopyR * 1.05, height * 0.55, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, trunkH + height * 0.55, 0]}>
            <coneGeometry args={[canopyR * 0.7, height * 0.4, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </>
      ) : (
        /* Standard pine — single cone */
        <mesh position={[0, trunkH + height * 0.35, 0]}>
          <coneGeometry args={[canopyR, height * 0.85, 8]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}
