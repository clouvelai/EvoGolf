import { type TreeNode, type SwingParams, type EvalContext, type TerminalName, isFuncNode, isTerminalNode } from './types.js';

const BASE_VALUES: Record<string, number> = {
  launch_angle: 45,
  power: 0.7,
  spin_x: 0,
  spin_z: 0,
};

/**
 * Evaluate a GP tree node to produce a numeric value.
 * Param terminals return their base value only when they match
 * ctx.activeParam, otherwise 0.
 * Wind and const terminals are always active.
 */
export function evaluateTree(node: TreeNode, ctx: EvalContext): number {
  if (isTerminalNode(node)) {
    switch (node.terminal) {
      case 'launch_angle':
      case 'power':
      case 'spin_x':
      case 'spin_z':
        return node.terminal === ctx.activeParam ? BASE_VALUES[node.terminal] : 0;
      case 'wind_x': return ctx.wind_x;
      case 'wind_z': return ctx.wind_z;
      case 'const': return node.value ?? 0;
    }
  }

  if (isFuncNode(node)) {
    const children = node.children;
    switch (node.op) {
      case 'add': {
        const a = evaluateTree(children[0], ctx);
        const b = evaluateTree(children[1], ctx);
        return a + b;
      }
      case 'sub': {
        const a = evaluateTree(children[0], ctx);
        const b = evaluateTree(children[1], ctx);
        return a - b;
      }
      case 'mul': {
        const a = evaluateTree(children[0], ctx);
        const b = evaluateTree(children[1], ctx);
        return clampResult(a * b);
      }
      case 'div_safe': {
        const a = evaluateTree(children[0], ctx);
        const b = evaluateTree(children[1], ctx);
        if (Math.abs(b) < 0.001) return 0;
        return clampResult(a / b);
      }
      case 'sin': {
        const a = evaluateTree(children[0], ctx);
        return Math.sin(a);
      }
      case 'cos': {
        const a = evaluateTree(children[0], ctx);
        return Math.cos(a);
      }
      case 'if_gt': {
        // if_gt(a, b, then, else): if a > b return then, else return else
        const a = evaluateTree(children[0], ctx);
        const b = evaluateTree(children[1], ctx);
        return a > b
          ? evaluateTree(children[2], ctx)
          : evaluateTree(children[3], ctx);
      }
      case 'max': {
        const a = evaluateTree(children[0], ctx);
        const b = evaluateTree(children[1], ctx);
        return Math.max(a, b);
      }
      case 'min': {
        const a = evaluateTree(children[0], ctx);
        const b = evaluateTree(children[1], ctx);
        return Math.min(a, b);
      }
    }
  }

  return 0;
}

/** Clamp intermediate results to prevent NaN/Infinity explosion */
function clampResult(v: number): number {
  if (!isFinite(v)) return 0;
  return Math.max(-1000, Math.min(1000, v));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Evaluate the tree 4 times with a different activeParam context each time.
 * Launch angle uses a separate evaluation: sum all const values in the tree
 * and map to [8, 60] via sigmoid, giving the GP direct control over angle
 * through its const terminals without needing a launch_angle terminal.
 */
export function treeToSwingParams(tree: TreeNode, windX: number, windZ: number): SwingParams {
  const base = { wind_x: windX, wind_z: windZ };

  // Launch angle: sum of all consts → sigmoid → [8, 60]
  const constSum = sumConsts(tree);
  const sigmoid = 1 / (1 + Math.exp(-constSum * 0.5));  // 0..1
  const launch_angle = 8 + sigmoid * 52;                 // [8, 60]

  return {
    launch_angle,
    power:  clamp(evaluateTree(tree, { ...base, activeParam: 'power' }), 0, 1),
    spin_x: clamp(evaluateTree(tree, { ...base, activeParam: 'spin_x' }), -1, 1),
    spin_z: clamp(evaluateTree(tree, { ...base, activeParam: 'spin_z' }), -1, 1),
  };
}

/** Sum all const terminal values in the tree */
function sumConsts(node: TreeNode): number {
  if (isTerminalNode(node)) {
    return node.terminal === 'const' ? (node.value ?? 0) : 0;
  }
  if (isFuncNode(node)) {
    let sum = 0;
    for (const child of node.children) {
      sum += sumConsts(child);
    }
    return sum;
  }
  return 0;
}
