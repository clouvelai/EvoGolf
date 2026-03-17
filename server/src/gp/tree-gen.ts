import { TreeNode, FuncNode, TerminalNode, FuncOp, TerminalName, FUNC_OPS, TERMINAL_NAMES, arity } from './types.js';
import { MAX_TREE_DEPTH } from '../constants.js';

/** Simple seeded-compatible random — uses Math.random */
function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randFloat(min, max + 1));
}

function randomElement<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

/** Create a random terminal node */
function randomTerminal(): TerminalNode {
  const name = randomElement(TERMINAL_NAMES);
  if (name === 'const') {
    return { terminal: 'const', value: Math.round(randFloat(-2, 2) * 1000) / 1000 };
  }
  return { terminal: name };
}

/** Create a random function node with given children */
function randomFunc(children: TreeNode[]): FuncNode {
  // Pick a function whose arity matches the number of children we can generate
  // We'll pick the op first, then generate the right number of children
  const op = randomElement(FUNC_OPS);
  return { op, children };
}

/**
 * Generate a random tree using the "full" method.
 * All branches extend exactly to the specified depth.
 */
export function generateFull(depth: number): TreeNode {
  if (depth <= 1) {
    return randomTerminal();
  }
  const op = randomElement(FUNC_OPS);
  const numChildren = arity(op);
  const children: TreeNode[] = [];
  for (let i = 0; i < numChildren; i++) {
    children.push(generateFull(depth - 1));
  }
  return { op, children };
}

/**
 * Generate a random tree using the "grow" method.
 * Branches may terminate early (randomly choosing between function and terminal).
 */
export function generateGrow(depth: number): TreeNode {
  if (depth <= 1) {
    return randomTerminal();
  }
  // At each non-leaf level, randomly pick function or terminal
  // Bias toward functions at higher depths to avoid trivial trees
  const funcProbability = depth > 2 ? 0.7 : 0.5;
  if (Math.random() < funcProbability) {
    const op = randomElement(FUNC_OPS);
    const numChildren = arity(op);
    const children: TreeNode[] = [];
    for (let i = 0; i < numChildren; i++) {
      children.push(generateGrow(depth - 1));
    }
    return { op, children };
  } else {
    return randomTerminal();
  }
}

/**
 * Ramped half-and-half tree generation.
 * For depths 2 through maxDepth, allocate equal shares of popSize.
 * Within each depth cohort, half use "full" and half use "grow".
 */
export function rampedHalfAndHalf(popSize: number, maxDepth: number = MAX_TREE_DEPTH): TreeNode[] {
  const minDepth = 2;
  const depthRange = maxDepth - minDepth + 1;
  const trees: TreeNode[] = [];

  for (let i = 0; i < popSize; i++) {
    // Assign depth by cycling through the range
    const depth = minDepth + (i % depthRange);
    // Alternate between full and grow
    if (i % 2 === 0) {
      trees.push(generateFull(depth));
    } else {
      trees.push(generateGrow(depth));
    }
  }

  return trees;
}
