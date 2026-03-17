import { type TreeNode, isFuncNode, parseTree } from '../lib/tree-types';
import { colorForOrigin } from '../lib/colors';

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
  genomes: GenomeRow[];
  selectedGenomeId: number | null;
  onSelectGenome: (genomeId: number) => void;
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

export default function GenomeTreePanel({
  genome,
  genomes,
  selectedGenomeId,
  onSelectGenome,
  onSponsor,
  sponsorDisabled,
}: GenomeTreePanelProps) {
  // Sort genomes: best fitness first
  const sorted = [...genomes].sort((a, b) => {
    // Unevaluated at the end
    if (a.fitness < 0 && b.fitness < 0) return 0;
    if (a.fitness < 0) return 1;
    if (b.fitness < 0) return -1;
    return b.fitness - a.fitness;
  });

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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="ui-panel-header">Population</div>

      {/* Genome picker list */}
      <div
        className="ui-scroll"
        style={{
          maxHeight: genomes.length > 0 && genome ? 140 : 200,
          overflowY: 'auto',
          marginBottom: 8,
          borderBottom: '1px solid rgba(102,204,255,0.1)',
          paddingBottom: 6,
        }}
      >
        {sorted.length === 0 && (
          <div style={{ opacity: 0.4, fontSize: 11, textAlign: 'center', padding: 8 }}>
            No genomes yet — click Initialize
          </div>
        )}
        {sorted.map((g) => {
          const isSelected = g.genomeId === selectedGenomeId;
          const originColor = colorForOrigin(g.origin);
          return (
            <div
              key={g.genomeId}
              onClick={() => onSelectGenome(g.genomeId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 6px',
                borderRadius: 4,
                cursor: 'pointer',
                background: isSelected ? 'rgba(102,204,255,0.12)' : 'transparent',
                borderLeft: isSelected ? '2px solid #66ccff' : '2px solid transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'rgba(102,204,255,0.06)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Origin color dot */}
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: originColor,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: '#e0e8f0', flex: 1 }}>
                #{g.genomeId}
                {g.isElite && <span style={{ color: '#ffd700', marginLeft: 3 }}>★</span>}
              </span>
              <span style={{ fontSize: 10, color: '#8090a0' }}>
                {g.fitness < 0 ? '—' : g.fitness.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Detail view for selected genome */}
      {genome ? (
        <>
          <div className="ui-panel-header" style={{ fontSize: 10 }}>
            Genome #{genome.genomeId}
            {genome.isElite && <span style={{ marginLeft: 6, color: '#ffd700' }}>★</span>}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`ui-badge ui-badge--${genome.origin}`}>
              {genome.origin}
            </span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>
              Fitness: <span style={{ color: '#ffd700', fontWeight: 600 }}>
                {genome.fitness < 0 ? '—' : genome.fitness.toFixed(4)}
              </span>
            </span>
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8 }}>
            Depth {genome.treeDepth} · {genome.nodeCount} nodes
          </div>

          {/* Tree visualization */}
          {(() => {
            const tree = parseTree(genome.treeJson);
            if (!tree) return null;
            return (
              <div
                className="ui-scroll"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  padding: '8px 0',
                  marginBottom: 8,
                  borderTop: '1px solid rgba(102,204,255,0.1)',
                  borderBottom: '1px solid rgba(102,204,255,0.1)',
                  flexShrink: 0,
                }}
              >
                <div style={{ minWidth: 'fit-content', display: 'flex', justifyContent: 'center' }}>
                  <TreeNodeView node={tree} depth={0} />
                </div>
              </div>
            );
          })()}

          <button
            className="ui-btn ui-btn--gold"
            style={{ width: '100%' }}
            onClick={onSponsor}
            disabled={sponsorDisabled}
          >
            Sponsor This Ball
          </button>
        </>
      ) : (
        <div style={{ fontSize: 11, opacity: 0.4, textAlign: 'center', padding: 4 }}>
          Select a genome above
        </div>
      )}
    </div>
  );
}
