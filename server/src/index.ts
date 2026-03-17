import { schema, table, t } from 'spacetimedb/server';
import { rampedHalfAndHalf } from './gp/tree-gen.js';
import { treeToSwingParams } from './gp/evaluate.js';
import { simulateBall } from './gp/physics.js';
import { computeFitness, distanceToHole } from './gp/fitness.js';
import { treeDepth, nodeCount, serializeTree, parseTree, clampTree } from './gp/utils.js';
import { tournamentSelection } from './gp/selection.js';
import { subtreeCrossover } from './gp/crossover.js';
import { mutateTree } from './gp/mutation.js';
import { FITNESS_UNEVAL, DEFAULT_TOURNAMENT_SIZE, DEFAULT_MUTATION_RATE } from './constants.js';

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
  }
);

const generation = table(
  { name: 'generation', public: true },
  {
    genId: t.u32().primaryKey().autoInc(),
    holeId: t.u32(),
    genNumber: t.u32(),
    phase: t.string(),
    bestFitness: t.f64(),
    avgFitness: t.f64(),
    popSize: t.u32(),
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
  { name: 'gp_event', public: true },
  {
    eventId: t.u32().primaryKey().autoInc(),
    genId: t.u32(),
    eventType: t.string(),
    description: t.string(),
    genomeIdsJson: t.string(),
  }
);

const player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().unique(),
    name: t.string(),
    wildcardGenomeId: t.u32(),
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
 * Returns the inserted genome row (with assigned genomeId).
 */
function insertGenomeWithBall(
  ctx: { db: { genome: { insert: Function }; golfBall: { insert: Function } } },
  genId: number,
  tree: import('./gp/types.js').TreeNode,
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
  });

  ctx.db.golfBall.insert({
    ballId: 0,
    genomeId: genomeRow.genomeId,
    genId,
    state: 'waiting',
    finalX: 0,
    finalZ: 0,
    distanceToHole: 0,
  });

  return genomeRow;
}

/**
 * Simulate all genomes in a generation: run physics, write trajectory points,
 * compute fitness, update ball/genome/generation rows.
 * Shared by simulateShots and advanceGeneration to avoid duplication.
 */
function simulateAndEvaluate(
  ctx: { db: any },
  genId: number,
  course: CourseInfo,
): void {
  const gen = ctx.db.generation.genId.find(genId);
  gen.phase = 'simulating';
  ctx.db.generation.genId.update(gen);

  let totalFitness = 0;
  let bestFitness = 0;
  let genomeCount = 0;
  const genomeIds: number[] = [];

  for (const genomeRow of ctx.db.genome.byGenId.filter(genId)) {
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
  });
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
    });
  }
);

// --- init_population ---
export const initPopulation = spacetimedb.reducer(
  { holeId: t.u32(), popSize: t.u32() },
  (ctx, { holeId, popSize }) => {
    // Validate hole exists
    const course = ctx.db.golfCourse.holeId.find(holeId);
    if (!course) {
      throw new Error(`Golf course with holeId ${holeId} not found`);
    }

    // Determine genNumber by finding max genNumber for this hole
    let maxGenNumber = -1;
    for (const gen of ctx.db.generation.iter()) {
      if (gen.holeId === holeId && gen.genNumber > maxGenNumber) {
        maxGenNumber = gen.genNumber;
      }
    }
    const genNumber = maxGenNumber + 1;

    // Create generation row
    const genRow = ctx.db.generation.insert({
      genId: 0, // autoInc
      holeId,
      genNumber,
      phase: 'init',
      bestFitness: 0,
      avgFitness: 0,
      popSize,
    });
    const genId = genRow.genId;

    // Generate random trees using ramped half-and-half
    const trees = rampedHalfAndHalf(ctx.random, popSize);

    const genomeIds: number[] = [];

    for (const tree of trees) {
      const row = insertGenomeWithBall(ctx, genId, tree, {
        origin: 'random', parentAId: 0, parentBId: 0, isElite: false,
      });
      genomeIds.push(row.genomeId);
    }

    // Log gp_event
    ctx.db.gpEvent.insert({
      eventId: 0, // autoInc
      genId,
      eventType: 'init',
      description: `Population initialized with ${popSize} genomes using ramped half-and-half (gen ${genNumber})`,
      genomeIdsJson: JSON.stringify(genomeIds),
    });
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

    const { popSize, holeId } = gen;
    const course = ctx.db.golfCourse.holeId.find(holeId);
    if (!course) throw new Error(`Golf course with holeId ${holeId} not found`);

    // Snapshot current genomes (avoid re-querying during mutation)
    const genomes: { genomeId: number; fitness: number; treeJson: string }[] = [];
    for (const g of ctx.db.genome.byGenId.filter(genId)) {
      genomes.push({ genomeId: g.genomeId, fitness: g.fitness, treeJson: g.treeJson });
    }

    // --- 1. Selection ---
    let wildcardId: number | null = null;
    for (const p of ctx.db.player.iter()) {
      if (p.wildcardGenomeId > 0 && genomes.some(g => g.genomeId === p.wildcardGenomeId)) {
        wildcardId = p.wildcardGenomeId;
        break;
      }
    }

    const numParents = Math.max(2, Math.floor(popSize / 2));
    const selectedIds = tournamentSelection(ctx.random, genomes, numParents, DEFAULT_TOURNAMENT_SIZE, wildcardId);

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
    });

    // --- 2. Create new generation + replicate elite ---
    let bestGenome = genomes[0];
    for (const g of genomes) {
      if (g.fitness > bestGenome.fitness) bestGenome = g;
    }

    const newGenRow = ctx.db.generation.insert({
      genId: 0, holeId, genNumber: gen.genNumber + 1,
      phase: 'init', bestFitness: 0, avgFitness: 0, popSize,
    });
    const newGenId = newGenRow.genId;

    const eliteRow = insertGenomeWithBall(ctx, newGenId, parseTree(bestGenome.treeJson), {
      origin: 'replication', parentAId: bestGenome.genomeId, parentBId: 0, isElite: true,
    });

    ctx.db.gpEvent.insert({
      eventId: 0, genId: newGenId, eventType: 'replicate',
      description: `Elite genome ${bestGenome.genomeId} (fitness ${bestGenome.fitness.toFixed(4)}) replicated`,
      genomeIdsJson: JSON.stringify([eliteRow.genomeId]),
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

      const childRow = insertGenomeWithBall(ctx, newGenId, childTree, {
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
    });

    // --- 4. Mutation ---
    const mutatedIds: number[] = [];
    for (const oid of offspringIds) {
      if (ctx.random() < DEFAULT_MUTATION_RATE) {
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
      description: `Mutated ${mutatedIds.length} of ${numOffspring} offspring (rate ${DEFAULT_MUTATION_RATE})`,
      genomeIdsJson: JSON.stringify(mutatedIds),
    });

    // --- 5. Clean up old trajectory points (keep last 2 gens) ---
    const keepGenIds = new Set<number>([genId, newGenId]);
    const ballsToClean: number[] = [];
    for (const ball of ctx.db.golfBall.iter()) {
      if (!keepGenIds.has(ball.genId)) {
        ballsToClean.push(ball.ballId);
      }
    }
    for (const ballId of ballsToClean) {
      for (const tp of ctx.db.trajectoryPoint.byBallId.filter(ballId)) {
        ctx.db.trajectoryPoint.delete(tp);
      }
    }

    // --- 6. Simulate new generation ---
    simulateAndEvaluate(ctx, newGenId, course);
  }
);

// --- set_wildcard ---
export const setWildcard = spacetimedb.reducer(
  { genomeId: t.u32() },
  (ctx, { genomeId }) => {
    // Verify genome exists
    const g = ctx.db.genome.genomeId.find(genomeId);
    if (!g) throw new Error(`Genome ${genomeId} not found`);

    // Find or create player row
    const sender = ctx.sender;
    const playerRow = ctx.db.player.identity.find(sender);
    if (playerRow) {
      ctx.db.player.delete(playerRow);
      ctx.db.player.insert({
        identity: sender,
        name: playerRow.name,
        wildcardGenomeId: genomeId,
      });
    } else {
      ctx.db.player.insert({
        identity: sender,
        name: '',
        wildcardGenomeId: genomeId,
      });
    }
  }
);
