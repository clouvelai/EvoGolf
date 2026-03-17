import { type TreeNode, type FuncNode, type TerminalNode, type FuncOp, type TerminalName, FUNC_OPS, TERMINAL_NAMES, arity } from './types.js';
import { MAX_TREE_DEPTH } from '../constants.js';

// All randomness must go through ctx.random in SpacetimeDB modules.
// We pass a Random-compatible object through all generation functions.

export type Rng = {
  (): number;                                    // float [0, 1)
  integerInRange(min: number, max: number): number; // int [min, max]
};

function randomElement<T>(rng: Rng, arr: T[]): T {
  return arr[rng.integerInRange(0, arr.length - 1)];
}

function randomTerminal(rng: Rng): TerminalNode {
  const name = randomElement(rng, TERMINAL_NAMES);
  if (name === 'const') {
    const value = Math.round((rng() * 4 - 2) * 1000) / 1000; // [-2, 2]
    return { terminal: 'const', value };
  }
  return { terminal: name };
}

/**
 * Generate a random tree using the "full" method.
 * All branches extend exactly to the specified depth.
 */
export function generateFull(rng: Rng, depth: number): TreeNode {
  if (depth <= 1) {
    return randomTerminal(rng);
  }
  const op = randomElement(rng, FUNC_OPS);
  const numChildren = arity(op);
  const children: TreeNode[] = [];
  for (let i = 0; i < numChildren; i++) {
    children.push(generateFull(rng, depth - 1));
  }
  return { op, children };
}

/**
 * Generate a random tree using the "grow" method.
 * Branches may terminate early (randomly choosing between function and terminal).
 */
export function generateGrow(rng: Rng, depth: number): TreeNode {
  if (depth <= 1) {
    return randomTerminal(rng);
  }
  const funcProbability = depth > 2 ? 0.7 : 0.5;
  if (rng() < funcProbability) {
    const op = randomElement(rng, FUNC_OPS);
    const numChildren = arity(op);
    const children: TreeNode[] = [];
    for (let i = 0; i < numChildren; i++) {
      children.push(generateGrow(rng, depth - 1));
    }
    return { op, children };
  } else {
    return randomTerminal(rng);
  }
}

/**
 * Ramped half-and-half tree generation.
 * For depths 2 through maxDepth, allocate equal shares of popSize.
 * Within each depth cohort, half use "full" and half use "grow".
 */
export function rampedHalfAndHalf(rng: Rng, popSize: number, maxDepth: number = MAX_TREE_DEPTH): TreeNode[] {
  const minDepth = 2;
  const depthRange = maxDepth - minDepth + 1;
  const trees: TreeNode[] = [];

  for (let i = 0; i < popSize; i++) {
    const depth = minDepth + (i % depthRange);
    if (i % 2 === 0) {
      trees.push(generateFull(rng, depth));
    } else {
      trees.push(generateGrow(rng, depth));
    }
  }

  return trees;
}
