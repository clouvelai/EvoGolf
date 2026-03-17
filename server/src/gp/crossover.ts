import { type TreeNode, isFuncNode } from './types.js';
import { type Rng } from './tree-gen.js';
import { nodeCount, replaceAtIndex } from './utils.js';

/**
 * Get the node at a given flat index (pre-order traversal).
 */
function getNodeAtIndex(node: TreeNode, targetIdx: number): TreeNode {
  if (targetIdx === 0) return node;

  if (!isFuncNode(node)) return node;

  let remaining = targetIdx - 1;
  for (const child of node.children) {
    const childSize = nodeCount(child);
    if (remaining < childSize) {
      return getNodeAtIndex(child, remaining);
    }
    remaining -= childSize;
  }

  return node;
}

/**
 * Deep-clone a TreeNode to avoid aliasing between parent trees.
 */
function cloneTree(node: TreeNode): TreeNode {
  if (!isFuncNode(node)) {
    return node.terminal === 'const'
      ? { terminal: node.terminal, value: node.value }
      : { terminal: node.terminal };
  }
  return { op: node.op, children: node.children.map(cloneTree) };
}

/**
 * Subtree crossover: pick a random node in parentA, replace it with a
 * random subtree from parentB. Returns the child tree.
 * Caller is responsible for clampTree after.
 */
export function subtreeCrossover(
  rng: Rng,
  parentA: TreeNode,
  parentB: TreeNode,
): TreeNode {
  const countA = nodeCount(parentA);
  const countB = nodeCount(parentB);

  const idxA = rng.integerInRange(0, countA - 1);
  const idxB = rng.integerInRange(0, countB - 1);

  const donor = cloneTree(getNodeAtIndex(parentB, idxB));
  return replaceAtIndex(parentA, idxA, () => donor);
}
