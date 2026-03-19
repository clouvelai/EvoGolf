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
export function pointMutateTree(rng: Rng, tree: TreeNode): TreeNode {
  const terminalIndices: number[] = [];
  collectTerminalIndices(tree, 0, terminalIndices);
  if (terminalIndices.length === 0) return tree;

  const targetIdx = terminalIndices[rng.integerInRange(0, terminalIndices.length - 1)];

  return replaceAtIndex(tree, targetIdx, (node) => {
    if (isFuncNode(node)) return node;
    if (node.terminal === 'const') {
      return { terminal: 'const', value: Math.round((rng() * 10 - 5) * 1000) / 1000 };
    }
    const others = TERMINAL_NAMES.filter(n => n !== node.terminal);
    const newName = others[rng.integerInRange(0, others.length - 1)];
    if (newName === 'const') {
      return { terminal: 'const', value: Math.round((rng() * 10 - 5) * 1000) / 1000 };
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
 * Collect flat indices of only const terminal nodes in pre-order.
 */
function collectConstIndices(node: TreeNode, currentIdx: number, indices: number[]): number {
  if (!isFuncNode(node)) {
    if (node.terminal === 'const') {
      indices.push(currentIdx);
    }
    return currentIdx + 1;
  }
  let idx = currentIdx + 1;
  for (const child of node.children) {
    idx = collectConstIndices(child, idx, indices);
  }
  return idx;
}

/**
 * Fine-tune mutation: only perturbs const terminal values with small Gaussian-like noise.
 * Never swaps terminal names or touches function nodes — designed for exploitation near convergence.
 */
export function fineTuneMutate(rng: Rng, tree: TreeNode): TreeNode {
  const constIndices: number[] = [];
  collectConstIndices(tree, 0, constIndices);
  if (constIndices.length === 0) return tree;

  const targetIdx = constIndices[rng.integerInRange(0, constIndices.length - 1)];

  return replaceAtIndex(tree, targetIdx, (node) => {
    if (isFuncNode(node) || node.terminal !== 'const') return node;
    const oldValue = node.value ?? 0;
    // Gaussian-ish perturbation via Box-Muller using 2 uniform randoms
    const u1 = rng();
    const u2 = rng();
    const gaussian = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
    const perturbation = gaussian * 1.5; // stddev 1.5 → meaningful swing param changes
    const newValue = Math.round((oldValue + perturbation) * 1000) / 1000;
    return { terminal: 'const', value: newValue };
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
    case 1: return pointMutateTree(rng, tree);
    case 2: return hoistMutation(rng, tree);
    default: return tree;
  }
}
