import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from './module_bindings';
import { localIdentity } from './main';
import CourseGround from './components/CourseGround';
import BallSwarm from './components/BallSwarm';
import TrajectoryLines from './components/TrajectoryLines';
import HUD from './components/HUD';
import FitnessChart from './components/FitnessChart';
import EventLog from './components/EventLog';
import GenomeTreePanel from './components/GenomeTreePanel';
import GPControlPanel from './components/GPControlPanel';
import CourseRotationOverlay from './components/CourseRotationOverlay';
import StrategyPicker from './components/StrategyPicker';
import PlayerList from './components/PlayerList';
import HallOfFame from './components/HallOfFame';
import CameraController from './components/CameraController';
import WinCelebration from './components/WinCelebration';
import RotationAnimation from './components/RotationAnimation';
import Minimap from './components/Minimap';

const MAX_AUTO_GENS = 1000;

type GamePhase = 'playing' | 'rotating' | 'picking';

export default function App() {
  const { isActive, getConnection } = useSpacetimeDB();
  const [courses] = useTable(tables.golfCourse);
  const [generations] = useTable(tables.generation);
  const [genomes] = useTable(tables.genome);
  const [balls] = useTable(tables.golfBall);
  const [gpEvents] = useTable(tables.gpEvent);
  const [hofEntries] = useTable(tables.hallOfFame);
  const [players] = useTable(tables.player);
  const [championBalls] = useTable(tables.championBall);

  const [selectedGenomeId, setSelectedGenomeId] = useState<number | null>(null);
  const [autoEvolving, setAutoEvolving] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [gamePhase, setGamePhase] = useState<GamePhase>('playing');
  const [hofMode, setHofMode] = useState(false);
  const [followMode, setFollowMode] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // Track course version to detect rotation
  const courseVersionRef = useRef<number | null>(null);
  const [winnerName, setWinnerName] = useState<string>('');
  const [winnerCourseVersion, setWinnerCourseVersion] = useState<number>(0);
  const [winnerColor, setWinnerColor] = useState<string>('#ffd700');

  // Auto-create game on first connect
  const gameCreatedRef = useRef(false);
  useEffect(() => {
    const conn = getConnection();
    if (isActive && courses.length === 0 && conn && !gameCreatedRef.current) {
      gameCreatedRef.current = true;
      conn.reducers.createGame({});
    }
  }, [isActive, courses.length, getConnection]);

  const course = courses[0] ?? null;

  // Identity helpers
  const myIdentity = localIdentity;
  const isMyIdentity = useCallback((id: any): boolean => {
    if (!myIdentity) return false;
    if (myIdentity.isEqual) return myIdentity.isEqual(id);
    return myIdentity === id;
  }, [myIdentity]);

  // Player color map (needed before course rotation effect)
  const playerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players) {
      map.set(p.identity.toHexString(), p.color);
    }
    return map;
  }, [players]);

  // Detect course rotation
  useEffect(() => {
    if (!course) return;
    const prevVersion = courseVersionRef.current;
    if (prevVersion !== null && course.courseVersion !== prevVersion) {
      const latestHof = hofEntries.length > 0
        ? hofEntries.reduce((a, b) => a.hofId > b.hofId ? a : b)
        : null;
      setWinnerName(latestHof?.playerName ?? 'Someone');
      setWinnerCourseVersion(prevVersion);
      setAutoEvolving(false);

      // Find winner's color
      if (latestHof) {
        const winPid = latestHof.playerId.toHexString();
        const wColor = playerColorMap.get(winPid);
        setWinnerColor(wColor ?? '#ffd700');
      }

      // Trigger celebration first, then rotation
      setCelebrating(true);
      setTimeout(() => {
        setCelebrating(false);
        setGamePhase('rotating');
      }, 2500);
    }
    courseVersionRef.current = course.courseVersion;
  }, [course?.courseVersion, hofEntries, playerColorMap]);

  // My generations (filtered by identity)
  const myGenerations = useMemo(() => {
    if (!myIdentity) return [];
    return generations.filter((g) => isMyIdentity(g.playerId));
  }, [generations, myIdentity, isMyIdentity]);

  // Current generation (my highest genNumber)
  const currentGen = useMemo(() => {
    if (myGenerations.length === 0) return null;
    let latest = myGenerations[0];
    for (const gen of myGenerations) {
      if (gen.genNumber > latest.genNumber) latest = gen;
    }
    return latest;
  }, [myGenerations]);

  const currentGenId = currentGen?.genId ?? null;

  // Sorted generations for fitness chart (mine only)
  const sortedGens = useMemo(() => {
    return [...myGenerations]
      .sort((a, b) => a.genNumber - b.genNumber)
      .map((g) => ({
        genNumber: g.genNumber,
        bestFitness: g.bestFitness,
        avgFitness: g.avgFitness,
      }));
  }, [myGenerations]);

  // Genomes in my current generation
  const currentGenGenomes = useMemo(() => {
    if (currentGenId == null) return [];
    return genomes.filter((g) => g.genId === currentGenId);
  }, [genomes, currentGenId]);

  // Selected genome
  const selectedGenome = useMemo(() => {
    if (selectedGenomeId == null) return null;
    return genomes.find((g) => g.genomeId === selectedGenomeId) ?? null;
  }, [genomes, selectedGenomeId]);

  // Best ball in my current gen
  const bestBall = useMemo(() => {
    const currentBalls = balls.filter((b) => b.genId === currentGenId && b.state === 'stopped');
    if (currentBalls.length === 0) return null;
    let best = currentBalls[0];
    for (const b of currentBalls) {
      if (b.distanceToHole < best.distanceToHole) best = b;
    }
    return best;
  }, [balls, currentGenId]);

  // Sorted events (my events only)
  const sortedEvents = useMemo(() => {
    if (!myIdentity) return [];
    return [...gpEvents]
      .filter((e) => isMyIdentity(e.playerId))
      .sort((a, b) => a.eventId - b.eventId);
  }, [gpEvents, myIdentity, isMyIdentity]);

  // Player name map
  const playerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players) {
      map.set(p.identity.toHexString(), p.name);
    }
    return map;
  }, [players]);

  // My player row
  const myPlayer = useMemo(() => {
    if (!myIdentity) return null;
    return players.find((p) => isMyIdentity(p.identity)) ?? null;
  }, [players, myIdentity, isMyIdentity]);

  // My champion balls
  const myChampionBalls = useMemo(() => {
    if (!myIdentity) return [];
    return championBalls.filter((c) => isMyIdentity(c.playerId));
  }, [championBalls, myIdentity, isMyIdentity]);

  // All active balls (for multiplayer rendering)
  const allActiveBalls = useMemo(() => {
    const latestGenByPlayer = new Map<string, number>();
    const latestGenNumberByPlayer = new Map<string, number>();
    for (const gen of generations) {
      const pid = gen.playerId.toHexString();
      const existing = latestGenNumberByPlayer.get(pid) ?? -1;
      if (gen.genNumber > existing) {
        latestGenByPlayer.set(pid, gen.genId);
        latestGenNumberByPlayer.set(pid, gen.genNumber);
      }
    }
    const activeGenIds = new Set(latestGenByPlayer.values());
    return balls.filter((b) => activeGenIds.has(b.genId));
  }, [generations, balls]);

  // Best ball position for camera follow
  const bestBallPosition = useMemo((): [number, number, number] | null => {
    if (!bestBall) return null;
    return [bestBall.finalX, 2, bestBall.finalZ];
  }, [bestBall]);

  // Course center for camera
  const courseCenter = useMemo((): [number, number, number] => {
    if (!course) return [0, 2, 55];
    return [
      (course.teeX + course.holeX) / 2,
      2,
      (course.teeZ + course.holeZ) / 2,
    ];
  }, [course]);

  // Hole position for effects
  const holePosition = useMemo((): [number, number, number] => {
    if (!course) return [0, 0.5, 137];
    return [course.holeX, 0.5, course.holeZ];
  }, [course]);

  // Auto-evolve logic
  useEffect(() => {
    if (!autoEvolving || !currentGen) return;
    if (currentGen.phase !== 'evaluated') return;
    if (currentGen.genNumber >= MAX_AUTO_GENS) {
      setAutoEvolving(false);
      return;
    }
    if (gamePhase !== 'playing') {
      setAutoEvolving(false);
      return;
    }

    const conn = getConnection();
    if (!conn) return;

    const timer = setTimeout(() => {
      conn.reducers.advanceGeneration({ genId: currentGen.genId });
    }, 2000);

    return () => clearTimeout(timer);
  }, [autoEvolving, currentGen, gamePhase, getConnection]);

  // Handlers
  const handleSelectGenome = useCallback((genomeId: number | null) => {
    setSelectedGenomeId(genomeId);
  }, []);

  const handleInitialize = useCallback((strategy: string = 'fresh', championId: number = 0) => {
    const conn = getConnection();
    if (!conn || !course) return;
    conn.reducers.initPopulation({
      holeId: course.holeId,
      popSize: 12,
      strategy,
      championId,
    });
    setGamePhase('playing');
  }, [getConnection, course]);

  const handleNextGen = useCallback(() => {
    const conn = getConnection();
    if (!conn || !currentGen) return;
    conn.reducers.advanceGeneration({ genId: currentGen.genId });
  }, [getConnection, currentGen]);

  const handleSponsor = useCallback(() => {
    const conn = getConnection();
    if (!conn || selectedGenomeId == null) return;
    conn.reducers.setWildcard({ genomeId: selectedGenomeId });
  }, [getConnection, selectedGenomeId]);

  const handleToggleAutoEvolve = useCallback(() => {
    setAutoEvolving((prev) => !prev);
  }, []);

  const handleRotationDismiss = useCallback(() => {
    setGamePhase('picking');
  }, []);

  const handleStrategyPick = useCallback((strategy: string, championId?: number) => {
    handleInitialize(strategy, championId ?? 0);
  }, [handleInitialize]);

  const handleOpenHof = useCallback(() => {
    setHofMode(true);
    setAutoEvolving(false);
  }, []);

  const handleCloseHof = useCallback(() => {
    setHofMode(false);
  }, []);

  const handleToggleFollow = useCallback(() => {
    setFollowMode((prev) => !prev);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#081828', position: 'relative' }}>
      {!isActive && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white', fontSize: '1.2rem', zIndex: 10,
        }}>
          Connecting to SpacetimeDB...
        </div>
      )}

      {/* HUD */}
      {course && (
        <HUD
          par={course.par}
          distance={course.distance}
          windX={course.windX}
          windZ={course.windZ}
          genNumber={currentGen?.genNumber ?? null}
          bestDistance={bestBall?.distanceToHole ?? null}
          courseVersion={course.courseVersion}
          playerCount={players.length}
        />
      )}

      {/* Player List */}
      <PlayerList
        players={players}
        generations={generations}
        myIdentity={myIdentity}
        isMyIdentity={isMyIdentity}
      />

      {/* Minimap */}
      {!hofMode && gamePhase === 'playing' && (
        <Minimap
          course={course}
          allBalls={allActiveBalls}
          myIdentity={myIdentity}
          playerColorMap={playerColorMap}
        />
      )}

      {/* Evolution UI (hidden in HoF mode or during rotation) */}
      {!hofMode && gamePhase === 'playing' && (
        <>
          <GPControlPanel
            phase={currentGen?.phase ?? null}
            genNumber={currentGen?.genNumber ?? null}
            bestFitness={currentGen?.bestFitness ?? null}
            avgFitness={currentGen?.avgFitness ?? null}
            hasPopulation={myGenerations.length > 0}
            autoEvolving={autoEvolving}
            speedMultiplier={speedMultiplier}
            hofCount={hofEntries.length}
            followMode={followMode}
            onInitialize={() => handleInitialize('fresh')}
            onNextGen={handleNextGen}
            onToggleAutoEvolve={handleToggleAutoEvolve}
            onSpeedChange={setSpeedMultiplier}
            onOpenHof={handleOpenHof}
            onToggleFollow={handleToggleFollow}
          />
          <FitnessChart generations={sortedGens} />
          <EventLog events={sortedEvents} />
          <GenomeTreePanel
            genome={selectedGenome}
            genomes={currentGenGenomes}
            selectedGenomeId={selectedGenomeId}
            onSelectGenome={handleSelectGenome}
            onSponsor={handleSponsor}
            sponsorDisabled={selectedGenomeId == null}
          />
        </>
      )}

      {/* Course Rotation Overlay */}
      {gamePhase === 'rotating' && (
        <CourseRotationOverlay
          winnerName={winnerName}
          courseVersion={winnerCourseVersion}
          onContinue={handleRotationDismiss}
        />
      )}

      {/* Strategy Picker */}
      {gamePhase === 'picking' && (
        <StrategyPicker
          hasCarryOver={!!myPlayer?.carryOverJson}
          championBalls={myChampionBalls}
          onPick={handleStrategyPick}
        />
      )}

      {/* Hall of Fame UI */}
      {hofMode && (
        <HallOfFame
          entries={hofEntries}
          onBack={handleCloseHof}
        />
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [-45, 50, -30], fov: 45, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#081828']} />
        <fog attach="fog" args={['#0a1e35', 160, 320]} />

        <hemisphereLight args={['#4488aa', '#1a4020', 0.4]} />
        <ambientLight intensity={0.5} color="#c0d4e8" />
        <directionalLight position={[60, 80, 30]} intensity={1.7} color="#fff0d0" castShadow={false} />
        <directionalLight position={[-30, 50, 160]} intensity={0.6} color="#aac8e0" />
        <directionalLight position={[-40, 40, -20]} intensity={0.3} color="#6bb8e0" />
        <pointLight position={[0, -5, 70]} intensity={0.5} color="#2a6090" distance={150} />

        {/* Course with rotation animation wrapper */}
        <RotationAnimation isRotating={gamePhase === 'rotating'}>
          <CourseGround course={course} />
        </RotationAnimation>

        {/* Win celebration particles */}
        <WinCelebration
          active={celebrating}
          holePosition={holePosition}
          winnerColor={winnerColor}
        />

        {!hofMode && (
          <>
            <BallSwarm
              selectedGenomeId={selectedGenomeId}
              onSelectGenome={handleSelectGenome}
              allBalls={allActiveBalls}
              myIdentity={myIdentity}
              playerColorMap={playerColorMap}
              playerNameMap={playerNameMap}
              speedMultiplier={speedMultiplier}
            />
            <TrajectoryLines
              selectedGenomeId={selectedGenomeId}
              allBalls={allActiveBalls}
              myIdentity={myIdentity}
              playerColorMap={playerColorMap}
            />
          </>
        )}

        <CameraController
          followMode={followMode}
          bestBallPosition={bestBallPosition}
          courseCenter={courseCenter}
          isRotating={gamePhase === 'rotating'}
        />
      </Canvas>
    </div>
  );
}
