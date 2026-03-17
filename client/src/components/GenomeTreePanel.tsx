import { type TreeNode, isFuncNode, parseTree } from '../lib/tree-types';

type GenomeRow = {
  genomeId: number;
  fitness: number;
  origin: string;
  treeJson: string;
  treeDepth: number;
  nodeCount: number;
  isElite: boolean;
};

type GenomeTreePanelProps = {
  genome: GenomeRow | null;
  onSponsor: () => void;
  sponsorDisabled: boolean;
};

function TreeNodeView({ node, depth }: { node: TreeNode; depth: number }) {
  if (depth > 3) {
    const count = countNodes(node);
    return (
      <span style={{
        fontSize: 10,
        color: 'rgba(102,204,255,0.5)',
        padding: '2px 6px',
        borderRadius: 8,
        background: 'rgba(102,204,255,0.06)',
      }}>
        [+{count}]
      </span>
    );
  }

  if (isFuncNode(node)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          padding: '2px 8px',
          borderRadius: 6,
          border: '1px solid rgba(102,204,255,0.35)',
          background: 'rgba(102,204,255,0.08)',
          fontSize: 11,
          fontWeight: 600,
          color: '#88ccee',
        }}>
          {node.op}
        </div>
        <div style={{
          width: 1,
          height: 6,
          background: 'rgba(102,204,255,0.15)',
        }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {node.children.map((child, i) => (
            <TreeNodeView key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  // Terminal node
  const PARAM_COLORS: Record<string, string> = {
    launch_angle: '#ffd700',
    power: '#ff55aa',
    spin_x: '#44ffaa',
    spin_z: '#66ccff',
    wind_x: '#8888cc',
    wind_z: '#8888cc',
    const: '#aaa',
  };
  const color = PARAM_COLORS[node.terminal] ?? '#aaa';
  const label = node.terminal === 'const'
    ? (node.value?.toFixed(2) ?? '?')
    : node.terminal.replace('_', ' ');

  return (
    <span style={{
      padding: '2px 7px',
      borderRadius: 10,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      fontSize: 10,
      color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function countNodes(node: TreeNode): number {
  if (isFuncNode(node)) {
    return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
  }
  return 1;
}

export default function GenomeTreePanel({ genome, onSponsor, sponsorDisabled }: GenomeTreePanelProps) {
  if (!genome) {
    return (
      <div
        className="ui-panel"
        style={{
          position: 'absolute',
          right: 12,
          top: 60,
          zIndex: 10,
          width: 260,
          textAlign: 'center',
          opacity: 0.5,
          fontSize: 12,
        }}
      >
        Click a ball to inspect its genome
      </div>
    );
  }

  const tree = parseTree(genome.treeJson);
  const fitnessDisplay = genome.fitness < 0 ? '—' : genome.fitness.toFixed(4);

  return (
    <div
      className="ui-panel"
      style={{
        position: 'absolute',
        right: 12,
        top: 60,
        zIndex: 10,
        width: 260,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}
    >
      <div className="ui-panel-header">
        Genome #{genome.genomeId}
        {genome.isElite && <span style={{ marginLeft: 6, color: '#ffd700' }}>★</span>}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`ui-badge ui-badge--${genome.origin}`}>
          {genome.origin}
        </span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>
          Fitness: <span style={{ color: '#ffd700', fontWeight: 600 }}>{fitnessDisplay}</span>
        </span>
      </div>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 10 }}>
        Depth {genome.treeDepth} · {genome.nodeCount} nodes
      </div>

      {/* Tree visualization */}
      {tree && (
        <div
          className="ui-scroll"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: '8px 0',
            marginBottom: 10,
            borderTop: '1px solid rgba(102,204,255,0.1)',
            borderBottom: '1px solid rgba(102,204,255,0.1)',
          }}
        >
          <div style={{ minWidth: 'fit-content', display: 'flex', justifyContent: 'center' }}>
            <TreeNodeView node={tree} depth={0} />
          </div>
        </div>
      )}

      {/* Sponsor button */}
      <button
        className="ui-btn ui-btn--gold"
        style={{ width: '100%' }}
        onClick={onSponsor}
        disabled={sponsorDisabled}
      >
        Sponsor This Ball
      </button>
    </div>
  );
}
