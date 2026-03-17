import { type TreeNode, type SwingParams, type EvalContext, isFuncNode, isTerminalNode } from './types.js';

/**
 * Evaluate a GP tree node to produce a numeric value.
 * Terminal base values:
 *   launch_angle → 45, power → 0.7, spin_x → 0, spin_z → 0
 *   wind_x/wind_z → context wind values, const → its stored value
 */
export function evaluateTree(node: TreeNode, ctx: EvalContext): number {
  if (isTerminalNode(node)) {
    switch (node.terminal) {
      case 'launch_angle': return 45;
      case 'power': return 0.7;
      case 'spin_x': return 0;
      case 'spin_z': return 0;
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
 * Evaluate a tree 4 times (once per swing param) by using
 * the raw tree output and mapping it to swing parameters.
 * The tree's output is treated as a modifier applied to base values.
 */
export function treeToSwingParams(tree: TreeNode, windX: number, windZ: number): SwingParams {
  const ctx: EvalContext = { wind_x: windX, wind_z: windZ };
  const rawValue = evaluateTree(tree, ctx);

  // Map the single tree output to swing params via different transformations
  // This gives each genome a unique swing character from its tree structure
  const launch_angle = clamp(45 + rawValue * 10, 10, 80);
  const power = clamp(0.7 + rawValue * 0.1, 0, 1);
  const spin_x = clamp(rawValue * 0.3, -1, 1);
  const spin_z = clamp(rawValue * 0.2, -1, 1);

  return { launch_angle, power, spin_x, spin_z };
}
