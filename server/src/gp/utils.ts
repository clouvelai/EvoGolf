import { type TreeNode, isFuncNode, TERMINAL_NAMES } from './types.js';
import { MAX_TREE_DEPTH } from '../constants.js';
import { type Rng } from './tree-gen.js';

/**
 * Compute the maximum depth of a tree.
 * A terminal node has depth 1.
 */
export function treeDepth(node: TreeNode): number {
  if (!isFuncNode(node)) return 1;
  let maxChildDepth = 0;
  for (const child of node.children) {
    const d = treeDepth(child);
    if (d > maxChildDepth) maxChildDepth = d;
  }
  return maxChildDepth + 1;
}

/**
 * Count the total number of nodes in a tree.
 */
export function nodeCount(node: TreeNode): number {
  if (!isFuncNode(node)) return 1;
  let count = 1; // this node
  for (const child of node.children) {
    count += nodeCount(child);
  }
  return count;
}

/**
 * Clamp a tree to MAX_TREE_DEPTH by replacing any subtree
 * that exceeds the depth limit with a random terminal.
 */
export function clampTree(rng: Rng, node: TreeNode, currentDepth: number = 1): TreeNode {
  if (!isFuncNode(node)) return node;

  if (currentDepth >= MAX_TREE_DEPTH) {
    // Replace with a random terminal
    const name = TERMINAL_NAMES[rng.integerInRange(0, TERMINAL_NAMES.length - 1)];
    if (name === 'const') {
      return { terminal: 'const', value: Math.round((rng() * 4 - 2) * 1000) / 1000 };
    }
    return { terminal: name };
  }

  const clampedChildren = node.children.map(child =>
    clampTree(rng, child, currentDepth + 1)
  );

  return { op: node.op, children: clampedChildren };
}

/**
 * Serialize a tree to JSON string.
 */
export function serializeTree(node: TreeNode): string {
  return JSON.stringify(node);
}

/**
 * Parse a JSON string into a TreeNode.
 * Returns a default terminal on malformed input rather than crashing the reducer.
 */
export function parseTree(json: string): TreeNode {
  try {
    return JSON.parse(json) as TreeNode;
  } catch {
    return { terminal: 'const', value: 0 } as TreeNode;
  }
}
