import { schema, table, t } from 'spacetimedb/server';
import { rampedHalfAndHalf } from './gp/tree-gen.js';
import { treeToSwingParams } from './gp/evaluate.js';
import { simulateBall } from './gp/physics.js';
import { computeFitness, distanceToHole } from './gp/fitness.js';
import { treeDepth, nodeCount, serializeTree, parseTree } from './gp/utils.js';
import { FITNESS_UNEVAL } from './constants.js';

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
      const treeJson = serializeTree(tree);
      const depth = treeDepth(tree);
      const nodes = nodeCount(tree);

      // Insert genome
      const genomeRow = ctx.db.genome.insert({
        genomeId: 0, // autoInc
        genId,
        treeJson,
        treeDepth: depth,
        nodeCount: nodes,
        fitness: FITNESS_UNEVAL,
        origin: 'random',
        parentAId: 0,
        parentBId: 0,
        isElite: false,
        isSelected: false,
      });

      genomeIds.push(genomeRow.genomeId);

      // Insert golf ball
      ctx.db.golfBall.insert({
        ballId: 0, // autoInc
        genomeId: genomeRow.genomeId,
        genId,
        state: 'waiting',
        finalX: 0,
        finalZ: 0,
        distanceToHole: 0,
      });
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
    // Validate generation exists
    const gen = ctx.db.generation.genId.find(genId);
    if (!gen) {
      throw new Error(`Generation ${genId} not found`);
    }

    // Get the course
    const course = ctx.db.golfCourse.holeId.find(gen.holeId);
    if (!course) {
      throw new Error(`Golf course with holeId ${gen.holeId} not found`);
    }

    // Update phase to simulating
    gen.phase = 'simulating';
    ctx.db.generation.genId.update(gen);

    let totalFitness = 0;
    let bestFitness = 0;
    let genomeCount = 0;

    // Process each genome in this generation
    for (const genomeRow of ctx.db.genome.byGenId.filter(genId)) {
      const tree = parseTree(genomeRow.treeJson);

      // Evaluate tree to get swing params
      const params = treeToSwingParams(tree, course.windX, course.windZ);

      // Simulate physics
      const trajectory = simulateBall(
        params,
        course.teeX,
        course.teeZ,
        course.windX,
        course.windZ,
      );

      // Find the golf ball for this genome
      let ball = null;
      for (const b of ctx.db.golfBall.byGenId.filter(genId)) {
        if (b.genomeId === genomeRow.genomeId) {
          ball = b;
          break;
        }
      }
      if (!ball) {
        throw new Error(`Golf ball not found for genome ${genomeRow.genomeId}`);
      }

      // Write trajectory points
      for (let step = 0; step < trajectory.length; step++) {
        const pt = trajectory[step];
        ctx.db.trajectoryPoint.insert({
          pointId: 0, // autoInc
          ballId: ball.ballId,
          step,
          x: pt.x,
          y: pt.y,
          z: pt.z,
        });
      }

      // Get final position
      const finalPos = trajectory[trajectory.length - 1];
      const finalX = finalPos.x;
      const finalZ = finalPos.z;

      // Compute distance and fitness
      const dist = distanceToHole(finalX, finalZ, course.holeX, course.holeZ);
      const fitness = computeFitness(finalX, finalZ, course.holeX, course.holeZ);

      // Update ball state
      ball.state = 'stopped';
      ball.finalX = finalX;
      ball.finalZ = finalZ;
      ball.distanceToHole = dist;
      ctx.db.golfBall.ballId.update(ball);

      // Update genome fitness
      genomeRow.fitness = fitness;
      ctx.db.genome.genomeId.update(genomeRow);

      totalFitness += fitness;
      if (fitness > bestFitness) bestFitness = fitness;
      genomeCount++;
    }

    // Update generation stats
    const genUpdated = ctx.db.generation.genId.find(genId);
    if (genUpdated) {
      genUpdated.phase = 'evaluated';
      genUpdated.bestFitness = bestFitness;
      genUpdated.avgFitness = genomeCount > 0 ? totalFitness / genomeCount : 0;
      ctx.db.generation.genId.update(genUpdated);
    }

    // Log gp_event
    const genomeIds: number[] = [];
    for (const g of ctx.db.genome.byGenId.filter(genId)) {
      genomeIds.push(g.genomeId);
    }

    ctx.db.gpEvent.insert({
      eventId: 0, // autoInc
      genId,
      eventType: 'simulate',
      description: `Simulated ${genomeCount} shots. Best fitness: ${bestFitness.toFixed(4)}, Avg: ${genomeCount > 0 ? (totalFitness / genomeCount).toFixed(4) : '0'}`,
      genomeIdsJson: JSON.stringify(genomeIds),
    });
  }
);
