import { Grid, Text } from '@react-three/drei';

type GolfCourse = {
  holeId: number;
  par: number;
  teeX: number;
  teeZ: number;
  holeX: number;
  holeZ: number;
  distance: number;
  windX: number;
  windZ: number;
} | null;

export default function CourseGround({ course }: { course: GolfCourse }) {
  const teeX = course?.teeX ?? 0;
  const teeZ = course?.teeZ ?? 0;
  const holeX = course?.holeX ?? 0;
  const holeZ = course?.holeZ ?? 137;

  return (
    <group>
      {/* Green ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 68]}>
        <planeGeometry args={[60, 160]} />
        <meshStandardMaterial color="#2d8a4e" />
      </mesh>

      {/* Grid overlay */}
      <Grid
        position={[0, 0, 68]}
        args={[60, 160]}
        cellSize={25}
        cellColor="#3a9d5e"
        sectionSize={50}
        sectionColor="#3a9d5e"
        fadeDistance={200}
        infiniteGrid={false}
      />

      {/* Tee box */}
      <mesh position={[teeX, 0.01, teeZ]}>
        <boxGeometry args={[3, 0.02, 2]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>

      {/* Hole / Pin */}
      <group position={[holeX, 0, holeZ]}>
        {/* Hole circle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.5, 32]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        {/* Flag pole */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 3, 8]} />
          <meshStandardMaterial color="#ccc" />
        </mesh>
        {/* Flag */}
        <mesh position={[0.5, 2.7, 0]}>
          <planeGeometry args={[1, 0.6]} />
          <meshStandardMaterial color="#e63946" side={2} />
        </mesh>
      </group>

      {/* Distance markers */}
      {[25, 50, 75, 100, 125].map((yard) => (
        <Text
          key={yard}
          position={[-28, 0.1, yard]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={2}
          color="#5aad70"
        >
          {yard}y
        </Text>
      ))}
    </group>
  );
}
