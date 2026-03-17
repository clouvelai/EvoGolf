export type FuncNode = {
  op: 'add' | 'sub' | 'mul' | 'div_safe' | 'sin' | 'cos' | 'if_gt' | 'max' | 'min';
  children: TreeNode[];
};

export type TerminalNode = {
  terminal: 'launch_angle' | 'power' | 'spin_x' | 'spin_z' | 'wind_x' | 'wind_z' | 'const';
  value?: number;
};

export type TreeNode = FuncNode | TerminalNode;

export function isFuncNode(node: TreeNode): node is FuncNode {
  return 'op' in node;
}

export function isTerminalNode(node: TreeNode): node is TerminalNode {
  return 'terminal' in node;
}

export function parseTree(json: string): TreeNode | null {
  try {
    return JSON.parse(json) as TreeNode;
  } catch {
    return null;
  }
}
