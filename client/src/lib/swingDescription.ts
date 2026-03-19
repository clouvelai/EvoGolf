import { type TreeNode, isFuncNode, isTerminalNode, parseTree } from './tree-types';

export type SwingParams = {
  launch_angle: number;
  power: number;
  spin_x: number;
  spin_z: number;
};

type EvalContext = {
  activeParam: string;
  wind_x: number;
  wind_z: number;
};

const BASE_VALUES: Record<string, number> = {
  launch_angle: 45,
  power: 0.7,
  spin_x: 0,
  spin_z: 0,
};

function evaluateTree(node: TreeNode, ctx: EvalContext): number {
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
      case 'add': return evaluateTree(children[0], ctx) + evaluateTree(children[1], ctx);
      case 'sub': return evaluateTree(children[0], ctx) - evaluateTree(children[1], ctx);
      case 'mul': return clampResult(evaluateTree(children[0], ctx) * evaluateTree(children[1], ctx));
      case 'div_safe': {
        const b = evaluateTree(children[1], ctx);
        if (Math.abs(b) < 0.001) return 0;
        return clampResult(evaluateTree(children[0], ctx) / b);
      }
      case 'sin': return Math.sin(evaluateTree(children[0], ctx));
      case 'cos': return Math.cos(evaluateTree(children[0], ctx));
      case 'if_gt': {
        const a = evaluateTree(children[0], ctx);
        const b = evaluateTree(children[1], ctx);
        return a > b ? evaluateTree(children[2], ctx) : evaluateTree(children[3], ctx);
      }
      case 'max': return Math.max(evaluateTree(children[0], ctx), evaluateTree(children[1], ctx));
      case 'min': return Math.min(evaluateTree(children[0], ctx), evaluateTree(children[1], ctx));
    }
  }

  return 0;
}

function clampResult(v: number): number {
  if (!isFinite(v)) return 0;
  return Math.max(-1000, Math.min(1000, v));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
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

export function treeToSwingParams(tree: TreeNode, windX: number, windZ: number): SwingParams {
  const base = { wind_x: windX, wind_z: windZ };

  // Launch angle: sum of all consts → sigmoid → [8, 60]
  const constSum = sumConsts(tree);
  const sigmoid = 1 / (1 + Math.exp(-constSum * 0.5));
  const launch_angle = 8 + sigmoid * 52;

  return {
    launch_angle,
    power:  clamp(evaluateTree(tree, { ...base, activeParam: 'power' }), 0, 1),
    spin_x: clamp(evaluateTree(tree, { ...base, activeParam: 'spin_x' }), -1, 1),
    spin_z: clamp(evaluateTree(tree, { ...base, activeParam: 'spin_z' }), -1, 1),
  };
}

export function describeSwing(params: SwingParams): string {
  const parts: string[] = [];

  // Launch angle [8, 60]
  if (params.launch_angle >= 48) parts.push('High lob');
  else if (params.launch_angle >= 38) parts.push('Arcing shot');
  else if (params.launch_angle >= 25) parts.push('Mid iron');
  else parts.push('Low bullet');

  // Power
  if (params.power >= 0.85) parts.push('full power');
  else if (params.power >= 0.6) parts.push('strong');
  else if (params.power >= 0.35) parts.push('medium');
  else parts.push('soft touch');

  // Curve (spin_x)
  if (params.spin_x < -0.4) parts.push('heavy draw');
  else if (params.spin_x < -0.15) parts.push('slight draw');
  else if (params.spin_x > 0.4) parts.push('heavy fade');
  else if (params.spin_x > 0.15) parts.push('slight fade');
  else parts.push('straight');

  // Backspin/topspin (spin_z)
  if (params.spin_z < -0.3) parts.push('backspin');
  else if (params.spin_z > 0.3) parts.push('topspin');

  return parts.join(', ');
}

export function describeSwingFromTree(treeJson: string, windX: number, windZ: number): { params: SwingParams; description: string } | null {
  const tree = parseTree(treeJson);
  if (!tree) return null;
  const params = treeToSwingParams(tree, windX, windZ);
  return { params, description: describeSwing(params) };
}
