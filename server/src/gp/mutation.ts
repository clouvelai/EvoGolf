import { type TreeNode, isFuncNode, TERMINAL_NAMES } from './types.js';
import { type Rng, generateGrow } from './tree-gen.js';
import { nodeCount, replaceAtIndex } from './utils.js';

/**
 * Collect flat indices of all terminal nodes in pre-order.
 */
function collectTerminalIndices(node: TreeNode, currentIdx: number, indices: number[]): number {
  if (!isFuncNode(node)) {
    indices.push(currentIdx);
    return currentIdx + 1;
  }
  let idx = currentIdx + 1;
  for (const child of node.children) {
    idx = collectTerminalIndices(child, idx, indices);
  }
  return idx;
}

/**
 * Collect flat indices of all function nodes in pre-order.
 */
function collectFuncIndices(node: TreeNode, currentIdx: number, indices: number[]): number {
  if (!isFuncNode(node)) return currentIdx + 1;
  indices.push(currentIdx);
  let idx = currentIdx + 1;
  for (const child of node.children) {
    idx = collectFuncIndices(child, idx, indices);
  }
  return idx;
}

/**
 * Subtree mutation: replace a random node with a new randomly grown subtree (depth 1-3).
 */
function subtreeMutation(rng: Rng, tree: TreeNode): TreeNode {
  const count = nodeCount(tree);
  const idx = rng.integerInRange(0, count - 1);
  const depth = rng.integerInRange(1, 3);
  return replaceAtIndex(tree, idx, () => generateGrow(rng, depth));
}

/**
 * Point mutation: pick a random terminal and change it.
 * If it's a const, randomize its value. Otherwise swap to a different terminal name.
 */
function pointMutation(rng: Rng, tree: TreeNode): TreeNode {
  const terminalIndices: number[] = [];
  collectTerminalIndices(tree, 0, terminalIndices);
  if (terminalIndices.length === 0) return tree;

  const targetIdx = terminalIndices[rng.integerInRange(0, terminalIndices.length - 1)];

  return replaceAtIndex(tree, targetIdx, (node) => {
    if (isFuncNode(node)) return node;
    if (node.terminal === 'const') {
      return { terminal: 'const', value: Math.round((rng() * 4 - 2) * 1000) / 1000 };
    }
    const others = TERMINAL_NAMES.filter(n => n !== node.terminal);
    const newName = others[rng.integerInRange(0, others.length - 1)];
    if (newName === 'const') {
      return { terminal: 'const', value: Math.round((rng() * 4 - 2) * 1000) / 1000 };
    }
    return { terminal: newName };
  });
}

/**
 * Hoist mutation: pick a random function node, replace it with one of its children.
 */
function hoistMutation(rng: Rng, tree: TreeNode): TreeNode {
  const funcIndices: number[] = [];
  collectFuncIndices(tree, 0, funcIndices);
  if (funcIndices.length === 0) return tree;

  const targetIdx = funcIndices[rng.integerInRange(0, funcIndices.length - 1)];

  return replaceAtIndex(tree, targetIdx, (node) => {
    if (!isFuncNode(node)) return node;
    const childIdx = rng.integerInRange(0, node.children.length - 1);
    return node.children[childIdx];
  });
}

/**
 * Mutate a tree using one of three strategies (equal probability):
 * 1. Subtree mutation — replace random node with new grown subtree
 * 2. Point mutation — swap a terminal's name or randomize a const's value
 * 3. Hoist mutation — replace a function node with one of its children
 *
 * Caller is responsible for clampTree after.
 */
export function mutateTree(rng: Rng, tree: TreeNode): TreeNode {
  const roll = rng.integerInRange(0, 2);
  switch (roll) {
    case 0: return subtreeMutation(rng, tree);
    case 1: return pointMutation(rng, tree);
    case 2: return hoistMutation(rng, tree);
    default: return tree;
  }
}
