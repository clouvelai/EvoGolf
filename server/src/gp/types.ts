export type FuncOp = 'add' | 'sub' | 'mul' | 'div_safe' | 'sin' | 'cos' | 'if_gt' | 'max' | 'min';

export type TerminalName = 'launch_angle' | 'power' | 'spin_x' | 'spin_z' | 'wind_x' | 'wind_z' | 'const';

export type FuncNode = {
  op: FuncOp;
  children: TreeNode[];
};

export type TerminalNode = {
  terminal: TerminalName;
  value?: number; // only for 'const', random in [-2, 2]
};

export type TreeNode = FuncNode | TerminalNode;

export type SwingParams = {
  launch_angle: number; // clamped [10, 80] degrees
  power: number;        // clamped [0, 1]
  spin_x: number;       // clamped [-1, 1]
  spin_z: number;       // clamped [-1, 1]
};

export type Vec3 = { x: number; y: number; z: number };

export type EvalContext = {
  wind_x: number;
  wind_z: number;
};

export function isFuncNode(node: TreeNode): node is FuncNode {
  return 'op' in node;
}

export function isTerminalNode(node: TreeNode): node is TerminalNode {
  return 'terminal' in node;
}

export const FUNC_OPS: FuncOp[] = ['add', 'sub', 'mul', 'div_safe', 'sin', 'cos', 'if_gt', 'max', 'min'];
export const TERMINAL_NAMES: TerminalName[] = ['launch_angle', 'power', 'spin_x', 'spin_z', 'wind_x', 'wind_z', 'const'];

/** Number of children each function operator expects */
export function arity(op: FuncOp): number {
  switch (op) {
    case 'sin':
    case 'cos':
      return 1;
    case 'if_gt':
      return 4; // if_gt(a, b, then, else)
    default:
      return 2;
  }
}
