import { TreeNode, isFuncNode } from './types.js';
import { MAX_TREE_DEPTH } from '../constants.js';
import { generateGrow } from './tree-gen.js';

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
export function clampTree(node: TreeNode, currentDepth: number = 1): TreeNode {
  if (!isFuncNode(node)) return node;

  if (currentDepth >= MAX_TREE_DEPTH) {
    // Replace this function node with a randomly generated small tree
    return generateGrow(1);
  }

  // Recursively clamp children
  const clampedChildren = node.children.map(child =>
    clampTree(child, currentDepth + 1)
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
 */
export function parseTree(json: string): TreeNode {
  return JSON.parse(json) as TreeNode;
}
