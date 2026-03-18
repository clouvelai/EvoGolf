import { schema, table, t } from 'spacetimedb/server';
import { rampedHalfAndHalf } from './gp/tree-gen.js';
import { treeToSwingParams } from './gp/evaluate.js';
import { simulateBall } from './gp/physics.js';
import { computeFitness, distanceToHole } from './gp/fitness.js';
import { treeDepth, nodeCount, serializeTree, parseTree, clampTree } from './gp/utils.js';
import { tournamentSelection } from './gp/selection.js';
import { subtreeCrossover } from './gp/crossover.js';
import { mutateTree } from './gp/mutation.js';
import { FITNESS_UNEVAL, DEFAULT_TOURNAMENT_SIZE, DEFAULT_MUTATION_RATE, HOLE_RADIUS, STAGNATION_GENS, STAGNATION_MUTATION_RATE } from './constants.js';

// --- Player color palette ---
const PLAYER_COLORS = [
  '#66ccff', // sky blue
  '#ff55aa', // hot pink
  '#44ffaa', // bright green
  '#ffa500', // orange
  '#aa55ff', // purple
  '#ff4444', // red
  '#00dddd', // cyan
  '#ffdd44', // yellow
];

// --- Tables ---

const golfCourse = table(
  { name: 'golf_course', public: true },
  {
    holeId: t.u32().primaryKey().autoInc(),
    par: t.u32(),
    teeX: t.f64(),
    teeZ: t.f64(),
    holeX: t.f64(),
    holeZ: t.f64(),
    distance: t.f64(),
    windX: t.f64(),
    windZ: t.f64(),
    courseVersion: t.u32(),
  }
);

const generation = table(
  {
    name: 'generation',
    public: true,
    indexes: [{ accessor: 'byPlayerId', algorithm: 'btree', columns: ['playerId'] }],
  },
  {
    genId: t.u32().primaryKey().autoInc(),
    holeId: t.u32(),
    genNumber: t.u32(),
    phase: t.string(),
    bestFitness: t.f64(),
    avgFitness: t.f64(),
    popSize: t.u32(),
    playerId: t.identity(),
  }
);

const genome = table(
  {
    name: 'genome',
    public: true,
    indexes: [{ accessor: 'byGenId', algorithm: 'btree', columns: ['genId'] }],
  },
  {
    genomeId: t.u32().primaryKey().autoInc(),
    genId: t.u32(),
    treeJson: t.string(),
    treeDepth: t.u32(),
    nodeCount: t.u32(),
    fitness: t.f64(),
    origin: t.string(),
    parentAId: t.u32(),
    parentBId: t.u32(),
    isElite: t.bool(),
    isSelected: t.bool(),
    playerId: t.identity(),
  }
);

const golfBall = table(
  {
    name: 'golf_ball',
    public: true,
    indexes: [{ accessor: 'byGenId', algorithm: 'btree', columns: ['genId'] }],
  },
  {
    ballId: t.u32().primaryKey().autoInc(),
    genomeId: t.u32(),
    genId: t.u32(),
    state: t.string(),
    finalX: t.f64(),
    finalZ: t.f64(),
    distanceToHole: t.f64(),
    playerId: t.identity(),
  }
);

const trajectoryPoint = table(
  {
    name: 'trajectory_point',
    public: true,
    indexes: [{ accessor: 'byBallId', algorithm: 'btree', columns: ['ballId'] }],
  },
  {
    pointId: t.u32().primaryKey().autoInc(),
    ballId: t.u32(),
    step: t.u32(),
    x: t.f64(),
    y: t.f64(),
    z: t.f64(),
  }
);

const gpEvent = table(
  {
    name: 'gp_event',
    public: true,
  },
  {
    eventId: t.u32().primaryKey().autoInc(),
    genId: t.u32(),
    eventType: t.string(),
    description: t.string(),
    genomeIdsJson: t.string(),
    playerId: t.identity(),
  }
);

const player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().unique(),
    name: t.string(),
    color: t.string(),
    carryOverJson: t.string(),
  }
);

const championBall = table(
  {
    name: 'champion_ball',
    public: true,
    indexes: [{ accessor: 'byPlayerId', algorithm: 'btree', columns: ['playerId'] }],
  },
  {
    championId: t.u32().primaryKey().autoInc(),
    playerId: t.identity(),
    treeJson: t.string(),
    courseVersion: t.u32(),
    generationsToSolve: t.u32(),
  }
);

const hallOfFame = table(
  { name: 'hall_of_fame', public: true },
  {
    hofId: t.u32().primaryKey().autoInc(),
    playerId: t.identity(),
    playerName: t.string(),
    courseVersion: t.u32(),
    generationsToSolve: t.u32(),
    teeX: t.f64(),
    teeZ: t.f64(),
    holeX: t.f64(),
    holeZ: t.f64(),
    windX: t.f64(),
    windZ: t.f64(),
  }
);

// --- Schema ---

const spacetimedb = schema({
  golfCourse,
  generation,
  genome,
  golfBall,
  trajectoryPoint,
  gpEvent,
  player,
  championBall,
  hallOfFame,
});
export default spacetimedb;

// --- Helpers ---

type CourseInfo = {
  teeX: number; teeZ: number;
  holeX: number; holeZ: number;
  windX: number; windZ: number;
};

/**
 * Insert a genome row + its corresponding golf_ball row.
 */
function insertGenomeWithBall(
  ctx: { db: any },
  genId: number,
  tree: import('./gp/types.js').TreeNode,
  playerId: any,
  opts: { origin: string; parentAId: number; parentBId: number; isElite: boolean },
) {
  const genomeRow = ctx.db.genome.insert({
    genomeId: 0,
    genId,
    treeJson: serializeTree(tree),
    treeDepth: treeDepth(tree),
    nodeCount: nodeCount(tree),
    fitness: FITNESS_UNEVAL,
    origin: opts.origin,
    parentAId: opts.parentAId,
    parentBId: opts.parentBId,
    isElite: opts.isElite,
    isSelected: false,
    playerId,
  });

  ctx.db.golfBall.insert({
    ballId: 0,
    genomeId: genomeRow.genomeId,
    genId,
    state: 'waiting',
    finalX: 0,
    finalZ: 0,
    distanceToHole: 0,
    playerId,
  });

  return genomeRow;
}

/**
 * Simulate all genomes in a generation: run physics, write trajectory points,
 * compute fitness, update ball/genome/generation rows.
 * Returns true if a hole-in-one was detected and course was rotated.
 */
function simulateAndEvaluate(
  ctx: { db: any; random: any },
  genId: number,
  course: CourseInfo,
): boolean {
  const gen = ctx.db.generation.genId.find(genId);
  gen.phase = 'simulating';
  ctx.db.generation.genId.update(gen);

  let totalFitness = 0;
  let bestFitness = 0;
  let genomeCount = 0;
  const genomeIds: number[] = [];

  // Collect genome rows to process
  const genomesToProcess: any[] = [];
  for (const genomeRow of ctx.db.genome.byGenId.filter(genId)) {
    genomesToProcess.push(genomeRow);
  }

  for (const genomeRow of genomesToProcess) {
    const tree = parseTree(genomeRow.treeJson);
    const params = treeToSwingParams(tree, course.windX, course.windZ);
    const trajectory = simulateBall(params, course.teeX, course.teeZ, course.windX, course.windZ);

    // Find the golf ball for this genome
    let ball = null;
    for (const b of ctx.db.golfBall.byGenId.filter(genId)) {
      if (b.genomeId === genomeRow.genomeId) {
        ball = b;
        break;
      }
    }
    if (!ball) throw new Error(`Golf ball not found for genome ${genomeRow.genomeId}`);

    // Write trajectory points
    for (let step = 0; step < trajectory.length; step++) {
      const pt = trajectory[step];
      ctx.db.trajectoryPoint.insert({
        pointId: 0,
        ballId: ball.ballId,
        step,
        x: pt.x,
        y: pt.y,
        z: pt.z,
      });
    }

    // Compute fitness from final position
    const finalPos = trajectory[trajectory.length - 1];
    const dist = distanceToHole(finalPos.x, finalPos.z, course.holeX, course.holeZ);
    const fitness = computeFitness(finalPos.x, finalPos.z, course.holeX, course.holeZ);

    ball.state = 'stopped';
    ball.finalX = finalPos.x;
    ball.finalZ = finalPos.z;
    ball.distanceToHole = dist;
    ctx.db.golfBall.ballId.update(ball);

    genomeRow.fitness = fitness;
    ctx.db.genome.genomeId.update(genomeRow);

    totalFitness += fitness;
    if (fitness > bestFitness) bestFitness = fitness;
    genomeCount++;
    genomeIds.push(genomeRow.genomeId);
  }

  // Update generation stats
  const genUpdated = ctx.db.generation.genId.find(genId);
  genUpdated.phase = 'evaluated';
  genUpdated.bestFitness = bestFitness;
  genUpdated.avgFitness = genomeCount > 0 ? totalFitness / genomeCount : 0;
  ctx.db.generation.genId.update(genUpdated);

  ctx.db.gpEvent.insert({
    eventId: 0,
    genId,
    eventType: 'simulate',
    description: `Simulated ${genomeCount} shots. Best fitness: ${bestFitness.toFixed(4)}, Avg: ${genomeCount > 0 ? (totalFitness / genomeCount).toFixed(4) : '0'}`,
    genomeIdsJson: JSON.stringify(genomeIds),
    playerId: genUpdated.playerId,
  });

  // --- Hole-in-one detection ---
  for (const ball of ctx.db.golfBall.byGenId.filter(genId)) {
    if (ball.distanceToHole < HOLE_RADIUS && ball.state === 'stopped') {
      // Found a hole-in-one!
      const winGenome = ctx.db.genome.genomeId.find(ball.genomeId);
      const winGen = ctx.db.generation.genId.find(genId);
      const winPlayer = ctx.db.player.identity.find(winGen.playerId);
      const winPlayerName = winPlayer?.name || 'Unknown';

      // Get course for snapshot
      let courseRow = null;
      for (const c of ctx.db.golfCourse.iter()) {
        courseRow = c;
        break;
      }
      if (!courseRow) return false;

      // 1. Save winning genome as champion ball
      ctx.db.championBall.insert({
        championId: 0,
        playerId: winGen.playerId,
        treeJson: winGenome.treeJson,
        courseVersion: courseRow.courseVersion,
        generationsToSolve: winGen.genNumber,
      });

      // 2. Save to Hall of Fame
      ctx.db.hallOfFame.insert({
        hofId: 0,
        playerId: winGen.playerId,
        playerName: winPlayerName,
        courseVersion: courseRow.courseVersion,
        generationsToSolve: winGen.genNumber,
        teeX: courseRow.teeX,
        teeZ: courseRow.teeZ,
        holeX: courseRow.holeX,
        holeZ: courseRow.holeZ,
        windX: courseRow.windX,
        windZ: courseRow.windZ,
      });

      // 3. Snapshot each player's best genome into carryOverJson
      for (const p of ctx.db.player.iter()) {
        let bestTree: string | null = null;
        let bestFit = -1;
        for (const g of ctx.db.genome.iter()) {
          if (g.playerId.__identity_bytes ?
              identityEquals(g.playerId, p.identity) :
              g.playerId === p.identity) {
            if (g.fitness > bestFit) {
              bestFit = g.fitness;
              bestTree = g.treeJson;
            }
          }
        }
        if (bestTree) {
          ctx.db.player.delete(p);
          ctx.db.player.insert({
            identity: p.identity,
            name: p.name,
            color: p.color,
            carryOverJson: bestTree,
          });
        }
      }

      // 4. Wipe ALL evolution data
      for (const tp of ctx.db.trajectoryPoint.iter()) ctx.db.trajectoryPoint.delete(tp);
      for (const b of ctx.db.golfBall.iter()) ctx.db.golfBall.delete(b);
      for (const g of ctx.db.genome.iter()) ctx.db.genome.delete(g);
      for (const gen of ctx.db.generation.iter()) ctx.db.generation.delete(gen);
      for (const evt of ctx.db.gpEvent.iter()) ctx.db.gpEvent.delete(evt);

      // 5. Generate new random course
      const newVersion = courseRow.courseVersion + 1;
      const newTeeX = (ctx.random() * 30) - 15;
      const newTeeZ = (ctx.random() * 20) - 10;
      const newHoleX = (ctx.random() * 30) - 15;
      const newHoleZ = 80 + ctx.random() * 120;
      const newWindX = (ctx.random() * 3) - 1.5;
      const newWindZ = (ctx.random() * 1) - 0.5;
      const dx = newHoleX - newTeeX;
      const dz = newHoleZ - newTeeZ;
      const newDistance = Math.round(Math.sqrt(dx * dx + dz * dz));

      ctx.db.golfCourse.delete(courseRow);
      ctx.db.golfCourse.insert({
        holeId: 0,
        par: 3,
        teeX: newTeeX,
        teeZ: newTeeZ,
        holeX: newHoleX,
        holeZ: newHoleZ,
        distance: newDistance,
        windX: newWindX,
        windZ: newWindZ,
        courseVersion: newVersion,
      });

      return true; // Course rotated
    }
  }

  return false; // No hole-in-one
}

/** Compare two SpacetimeDB identities */
function identityEquals(a: any, b: any): boolean {
  if (a === b) return true;
  if (a?.isEqual) return a.isEqual(b);
  if (a?.__identity__ != null && b?.__identity__ != null) {
    return a.__identity__ === b.__identity__;
  }
  return false;
}

// --- Reducers ---

export const createGame = spacetimedb.reducer(
  (ctx) => {
    // Idempotent — no-op if a course already exists
    for (const _row of ctx.db.golfCourse.iter()) {
      return;
    }

    ctx.db.golfCourse.insert({
      holeId: 0,
      par: 3,
      teeX: 0,
      teeZ: 0,
      holeX: 0,
      holeZ: 137,
      distance: 150,
      windX: 0.5,
      windZ: 0.2,
      courseVersion: 1,
    });
  }
);

// --- register_player ---
export const registerPlayer = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    const sender = ctx.sender;
    const existing = ctx.db.player.identity.find(sender);
    if (existing) return; // Idempotent

    // Assign color based on player count
    let count = 0;
    for (const _p of ctx.db.player.iter()) count++;
    const color = PLAYER_COLORS[count % PLAYER_COLORS.length];

    const displayName = name || `Player ${count + 1}`;

    ctx.db.player.insert({
      identity: sender,
      name: displayName,
      color,
      carryOverJson: '',
    });
  }
);

// --- init_population ---
export const initPopulation = spacetimedb.reducer(
  { holeId: t.u32(), popSize: t.u32(), strategy: t.string(), championId: t.u32() },
  (ctx, { holeId, popSize, strategy, championId }) => {
    const sender = ctx.sender;

    // Validate hole exists
    const course = ctx.db.golfCourse.holeId.find(holeId);
    if (!course) {
      throw new Error(`Golf course with holeId ${holeId} not found`);
    }

    // Ensure player is registered
    const playerRow = ctx.db.player.identity.find(sender);
    if (!playerRow) {
      throw new Error('Player not registered. Call registerPlayer first.');
    }

    // --- Snapshot best genome before cleanup ---
    let bestTreeJson: string | null = null;
    let bestFit = -1;
    for (const g of ctx.db.genome.iter()) {
      if (identityEquals(g.playerId, sender) && g.fitness > bestFit) {
        bestFit = g.fitness;
        bestTreeJson = g.treeJson;
      }
    }
    if (bestTreeJson) {
      ctx.db.player.delete(playerRow);
      ctx.db.player.insert({
        identity: sender,
        name: playerRow.name,
        color: playerRow.color,
        carryOverJson: bestTreeJson,
      });
    }

    // --- Clean up THIS player's previous data only ---
    const myBallIds = new Set<number>();
    for (const ball of ctx.db.golfBall.iter()) {
      if (identityEquals(ball.playerId, sender)) {
        myBallIds.add(ball.ballId);
      }
    }
    for (const tp of ctx.db.trajectoryPoint.iter()) {
      if (myBallIds.has(tp.ballId)) {
        ctx.db.trajectoryPoint.delete(tp);
      }
    }
    for (const ball of ctx.db.golfBall.iter()) {
      if (identityEquals(ball.playerId, sender)) {
        ctx.db.golfBall.delete(ball);
      }
    }
    for (const g of ctx.db.genome.iter()) {
      if (identityEquals(g.playerId, sender)) {
        ctx.db.genome.delete(g);
      }
    }
    for (const gen of ctx.db.generation.iter()) {
      if (identityEquals(gen.playerId, sender)) {
        ctx.db.generation.delete(gen);
      }
    }
    for (const evt of ctx.db.gpEvent.iter()) {
      if (identityEquals(evt.playerId, sender)) {
        ctx.db.gpEvent.delete(evt);
      }
    }

    const genNumber = 1;

    // Create generation row
    const genRow = ctx.db.generation.insert({
      genId: 0,
      holeId,
      genNumber,
      phase: 'init',
      bestFitness: 0,
      avgFitness: 0,
      popSize,
      playerId: sender,
    });
    const genId = genRow.genId;

    // --- Determine elite seed based on strategy ---
    let eliteTree: import('./gp/types.js').TreeNode | null = null;

    if (strategy === 'carryOver') {
      // Re-read player row in case we updated it above
      const pRow = ctx.db.player.identity.find(sender);
      if (pRow && pRow.carryOverJson && pRow.carryOverJson !== '') {
        eliteTree = parseTree(pRow.carryOverJson);
      }
    } else if (strategy === 'champion' && championId > 0) {
      const champ = ctx.db.championBall.championId.find(championId);
      if (champ && identityEquals(champ.playerId, sender)) {
        eliteTree = parseTree(champ.treeJson);
      }
    }

    const genomeIds: number[] = [];

    if (eliteTree) {
      // Insert elite seed
      const eliteRow = insertGenomeWithBall(ctx, genId, eliteTree, sender, {
        origin: 'replication', parentAId: 0, parentBId: 0, isElite: true,
      });
      genomeIds.push(eliteRow.genomeId);

      // Generate remaining random trees
      const randomTrees = rampedHalfAndHalf(ctx.random, popSize - 1);
      for (const tree of randomTrees) {
        const row = insertGenomeWithBall(ctx, genId, tree, sender, {
          origin: 'random', parentAId: 0, parentBId: 0, isElite: false,
        });
        genomeIds.push(row.genomeId);
      }
    } else {
      // All random (fresh start or fallback)
      const trees = rampedHalfAndHalf(ctx.random, popSize);
      for (const tree of trees) {
        const row = insertGenomeWithBall(ctx, genId, tree, sender, {
          origin: 'random', parentAId: 0, parentBId: 0, isElite: false,
        });
        genomeIds.push(row.genomeId);
      }
    }

    // Log gp_event
    ctx.db.gpEvent.insert({
      eventId: 0,
      genId,
      eventType: 'init',
      description: `Population initialized with ${popSize} genomes (strategy: ${strategy}, gen ${genNumber})`,
      genomeIdsJson: JSON.stringify(genomeIds),
      playerId: sender,
    });

    // Simulate all shots immediately
    simulateAndEvaluate(ctx, genId, course);
  }
);

// --- simulate_shots ---
export const simulateShots = spacetimedb.reducer(
  { genId: t.u32() },
  (ctx, { genId }) => {
    const gen = ctx.db.generation.genId.find(genId);
    if (!gen) throw new Error(`Generation ${genId} not found`);

    const course = ctx.db.golfCourse.holeId.find(gen.holeId);
    if (!course) throw new Error(`Golf course with holeId ${gen.holeId} not found`);

    simulateAndEvaluate(ctx, genId, course);
  }
);

// --- advance_generation (orchestrator) ---
export const advanceGeneration = spacetimedb.reducer(
  { genId: t.u32() },
  (ctx, { genId }) => {
    // --- Validate ---
    const gen = ctx.db.generation.genId.find(genId);
    if (!gen) throw new Error(`Generation ${genId} not found`);
    if (gen.phase !== 'evaluated') {
      throw new Error(`Generation ${genId} phase is '${gen.phase}', expected 'evaluated'`);
    }

    // Validate ownership
    if (!identityEquals(gen.playerId, ctx.sender)) {
      throw new Error('You can only advance your own generations');
    }

    const { popSize, holeId } = gen;
    const course = ctx.db.golfCourse.holeId.find(holeId);
    if (!course) throw new Error(`Golf course with holeId ${holeId} not found`);

    const sender = ctx.sender;

    // Snapshot current genomes
    const genomes: { genomeId: number; fitness: number; treeJson: string }[] = [];
    for (const g of ctx.db.genome.byGenId.filter(genId)) {
      genomes.push({ genomeId: g.genomeId, fitness: g.fitness, treeJson: g.treeJson });
    }

    // --- 1. Selection ---
    const numParents = Math.max(2, Math.floor(popSize / 2));
    const selectedIds = tournamentSelection(ctx.random, genomes, numParents, DEFAULT_TOURNAMENT_SIZE, null);

    for (const sid of selectedIds) {
      const gRow = ctx.db.genome.genomeId.find(sid);
      if (gRow) {
        gRow.isSelected = true;
        ctx.db.genome.genomeId.update(gRow);
      }
    }

    gen.phase = 'selecting';
    ctx.db.generation.genId.update(gen);

    ctx.db.gpEvent.insert({
      eventId: 0, genId, eventType: 'select',
      description: `Selected ${selectedIds.length} parents via tournament selection (size ${DEFAULT_TOURNAMENT_SIZE})`,
      genomeIdsJson: JSON.stringify(selectedIds),
      playerId: sender,
    });

    // --- 2. Create new generation + replicate elite ---
    let bestGenome = genomes[0];
    for (const g of genomes) {
      if (g.fitness > bestGenome.fitness) bestGenome = g;
    }

    const newGenRow = ctx.db.generation.insert({
      genId: 0, holeId, genNumber: gen.genNumber + 1,
      phase: 'init', bestFitness: 0, avgFitness: 0, popSize,
      playerId: sender,
    });
    const newGenId = newGenRow.genId;

    const eliteRow = insertGenomeWithBall(ctx, newGenId, parseTree(bestGenome.treeJson), sender, {
      origin: 'replication', parentAId: bestGenome.genomeId, parentBId: 0, isElite: true,
    });

    ctx.db.gpEvent.insert({
      eventId: 0, genId: newGenId, eventType: 'replicate',
      description: `Elite genome ${bestGenome.genomeId} (fitness ${bestGenome.fitness.toFixed(4)}) replicated`,
      genomeIdsJson: JSON.stringify([eliteRow.genomeId]),
      playerId: sender,
    });

    // --- 3. Crossover ---
    const selectedGenomes = genomes.filter(g => selectedIds.includes(g.genomeId));
    const numOffspring = popSize - 1;
    const offspringIds: number[] = [];

    for (let i = 0; i < numOffspring; i++) {
      const pAIdx = ctx.random.integerInRange(0, selectedGenomes.length - 1);
      let pBIdx = ctx.random.integerInRange(0, selectedGenomes.length - 1);
      if (selectedGenomes.length > 1) {
        let attempts = 0;
        while (pBIdx === pAIdx && attempts < 5) {
          pBIdx = ctx.random.integerInRange(0, selectedGenomes.length - 1);
          attempts++;
        }
      }

      const parentA = parseTree(selectedGenomes[pAIdx].treeJson);
      const parentB = parseTree(selectedGenomes[pBIdx].treeJson);
      const childTree = clampTree(ctx.random, subtreeCrossover(ctx.random, parentA, parentB));

      const childRow = insertGenomeWithBall(ctx, newGenId, childTree, sender, {
        origin: 'crossover',
        parentAId: selectedGenomes[pAIdx].genomeId,
        parentBId: selectedGenomes[pBIdx].genomeId,
        isElite: false,
      });
      offspringIds.push(childRow.genomeId);
    }

    newGenRow.phase = 'breeding';
    ctx.db.generation.genId.update(newGenRow);

    ctx.db.gpEvent.insert({
      eventId: 0, genId: newGenId, eventType: 'crossover',
      description: `Created ${numOffspring} offspring via subtree crossover`,
      genomeIdsJson: JSON.stringify(offspringIds),
      playerId: sender,
    });

    // --- 4. Mutation (with stagnation detection) ---
    // Check if fitness has stagnated over recent generations
    let stagnant = false;
    const myGens: { genNumber: number; bestFitness: number }[] = [];
    for (const g of ctx.db.generation.iter()) {
      if (identityEquals(g.playerId, sender) && g.phase === 'evaluated') {
        myGens.push({ genNumber: g.genNumber, bestFitness: g.bestFitness });
      }
    }
    if (myGens.length >= STAGNATION_GENS) {
      myGens.sort((a, b) => b.genNumber - a.genNumber);
      const recentBest = myGens[0].bestFitness;
      let unchangedCount = 0;
      for (let i = 1; i < myGens.length && i < STAGNATION_GENS; i++) {
        if (Math.abs(myGens[i].bestFitness - recentBest) < 0.001) {
          unchangedCount++;
        }
      }
      stagnant = unchangedCount >= STAGNATION_GENS - 1;
    }

    const mutationRate = stagnant ? STAGNATION_MUTATION_RATE : DEFAULT_MUTATION_RATE;
    const mutatedIds: number[] = [];
    for (const oid of offspringIds) {
      if (ctx.random() < mutationRate) {
        const gRow = ctx.db.genome.genomeId.find(oid);
        if (gRow) {
          const tree = clampTree(ctx.random, mutateTree(ctx.random, parseTree(gRow.treeJson)));
          gRow.treeJson = serializeTree(tree);
          gRow.treeDepth = treeDepth(tree);
          gRow.nodeCount = nodeCount(tree);
          gRow.origin = 'mutation';
          ctx.db.genome.genomeId.update(gRow);
          mutatedIds.push(oid);
        }
      }
    }

    ctx.db.gpEvent.insert({
      eventId: 0, genId: newGenId, eventType: 'mutate',
      description: `Mutated ${mutatedIds.length} of ${numOffspring} offspring (rate ${mutationRate.toFixed(2)}${stagnant ? ' STAGNATION BOOST' : ''})`,
      genomeIdsJson: JSON.stringify(mutatedIds),
      playerId: sender,
    });

    // --- 5. Clean up old trajectory points (keep last 2 gens for THIS player) ---
    const myGenIds = new Set<number>();
    for (const g of ctx.db.generation.iter()) {
      if (identityEquals(g.playerId, sender)) {
        myGenIds.add(g.genId);
      }
    }
    const keepGenIds = new Set<number>([genId, newGenId]);
    const ballsToClean: number[] = [];
    for (const ball of ctx.db.golfBall.iter()) {
      if (identityEquals(ball.playerId, sender) && !keepGenIds.has(ball.genId)) {
        ballsToClean.push(ball.ballId);
      }
    }
    for (const ballId of ballsToClean) {
      for (const tp of ctx.db.trajectoryPoint.byBallId.filter(ballId)) {
        ctx.db.trajectoryPoint.delete(tp);
      }
    }

    // --- 6. Simulate new generation ---
    const courseRotated = simulateAndEvaluate(ctx, newGenId, course);
    // If course rotated, all data was wiped — caller handles this via client
  }
);

// --- set_wildcard ---
export const setWildcard = spacetimedb.reducer(
  { genomeId: t.u32() },
  (ctx, { genomeId }) => {
    const g = ctx.db.genome.genomeId.find(genomeId);
    if (!g) throw new Error(`Genome ${genomeId} not found`);

    // Validate ownership
    if (!identityEquals(g.playerId, ctx.sender)) {
      throw new Error('You can only sponsor your own genomes');
    }
  }
);
