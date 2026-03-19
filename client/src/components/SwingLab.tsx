import { useMemo, useState } from 'react';
import { colorForOrigin } from '../lib/colors';
import { describeSwingFromTree } from '../lib/swingDescription';
import { type TreeNode, isFuncNode, isTerminalNode, parseTree } from '../lib/tree-types';

type GenomeRow = {
  genomeId: number;
  fitness: number;
  origin: string;
  treeJson: string;
  treeDepth: number;
  nodeCount: number;
  isElite: boolean;
  parentAId: number;
  parentBId: number;
};

type SwingLabProps = {
  genome: GenomeRow | null;
  genomes: GenomeRow[];
  selectedGenomeId: number | null;
  isAutoSelected: boolean;
  onSelectGenome: (genomeId: number | null) => void;
  onSponsor: () => void;
  sponsorDisabled: boolean;
  windX: number;
  windZ: number;
  bestDistance: number | null;
  selectedDistance: number | null;
  genNumber: number | null;
  inspectedPlayerName?: string | null;
  onClearInspection?: () => void;
};

function ParamBar({ label, value, min, max, unit, color }: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  color: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
      <span style={{ width: 42, opacity: 0.6, textAlign: 'right' }}>{label}</span>
      <div style={{
        flex: 1,
        height: 6,
        borderRadius: 3,
        background: 'rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${Math.max(2, Math.min(100, pct))}%`,
          borderRadius: 3,
          background: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ width: 50, textAlign: 'right', fontWeight: 600, color }}>{unit}</span>
    </div>
  );
}

function originNarrative(origin: string): string {
  switch (origin) {
    case 'crossover': return 'Crossover combined two swings';
    case 'mutation': return 'Mutation tweaked the swing';
    case 'replication': return 'Elite carried forward';
    case 'random': return 'Fresh random swing';
    case 'elite_mutation': return 'Fine-tuned from elite swing';
    case 'elite_crossover': return 'Elite bred with top finisher';
    default: return '';
  }
}

function originDetail(origin: string, parentAId: number, parentBId: number): string {
  switch (origin) {
    case 'crossover': return `crossover(#${parentAId} × #${parentBId})`;
    case 'mutation': return `mutation(#${parentAId})`;
    case 'replication': return `replication(#${parentAId})`;
    case 'random': return 'random';
    case 'elite_mutation': return `elite_mutation(#${parentAId})`;
    case 'elite_crossover': return `elite_crossover(#${parentAId} × #${parentBId})`;
    default: return origin;
  }
}

function renderTreeText(node: TreeNode, prefix: string = '', isLast: boolean = true, isRoot: boolean = true): string {
  const connector = isRoot ? '' : (isLast ? '└─ ' : '├─ ');
  const childPrefix = isRoot ? '' : (isLast ? '   ' : '│  ');

  if (isTerminalNode(node)) {
    const label = node.terminal === 'const' ? `const(${(node.value ?? 0).toFixed(2)})` : node.terminal;
    return prefix + connector + label + '\n';
  }

  if (isFuncNode(node)) {
    let result = prefix + connector + node.op + '\n';
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
      result += renderTreeText(children[i], prefix + childPrefix, i === children.length - 1, false);
    }
    return result;
  }

  return prefix + connector + '???\n';
}

/** Compute distance to hole from fitness: distance = (1/fitness) - 1 */
function fitnessToDistance(fitness: number): number | null {
  if (fitness <= 0) return null;
  return (1 / fitness) - 1;
}

/** One-line narrative of what happened this generation */
function evolutionSummary(genomes: GenomeRow[]): { text: string; color: string } {
  const elite = genomes.find(g => g.isElite);
  const eliteVariants = genomes.filter(g =>
    g.origin === 'elite_mutation' || g.origin === 'elite_crossover'
  );
  const evaluated = genomes.filter(g => g.fitness > 0);
  if (evaluated.length === 0 || !elite || elite.fitness <= 0) {
    return { text: '', color: '#8090a0' };
  }

  const best = evaluated.reduce((a, b) => a.fitness > b.fitness ? a : b);

  if (best.genomeId === elite.genomeId) {
    const closestVariant = eliteVariants
      .filter(v => v.fitness > 0)
      .sort((a, b) => b.fitness - a.fitness)[0];
    if (closestVariant) {
      const eliteDist = fitnessToDistance(elite.fitness)!;
      const variantDist = fitnessToDistance(closestVariant.fitness)!;
      const delta = variantDist - eliteDist;
      return {
        text: `Elite leads. Closest variant ${delta > 0 ? '+' : ''}${delta.toFixed(1)} yds`,
        color: '#ffd700',
      };
    }
    return { text: 'Elite still closest', color: '#ffd700' };
  }

  if (best.origin === 'elite_mutation' || best.origin === 'elite_crossover') {
    const eliteDist = fitnessToDistance(elite.fitness)!;
    const bestDist = fitnessToDistance(best.fitness)!;
    const delta = eliteDist - bestDist;
    const label = best.origin === 'elite_mutation' ? 'Mutation' : 'Crossover';
    return {
      text: `${label} beat elite by ${delta.toFixed(1)} yds!`,
      color: best.origin === 'elite_mutation' ? '#ffaa44' : '#aaff44',
    };
  }

  return { text: 'Exploration found a new best!', color: '#66ccff' };
}

export default function SwingLab({
  genome,
  genomes,
  selectedGenomeId,
  isAutoSelected,
  onSelectGenome,
  onSponsor,
  sponsorDisabled,
  windX,
  windZ,
  bestDistance,
  selectedDistance,
  genNumber,
  inspectedPlayerName,
  onClearInspection,
}: SwingLabProps) {
  const [showTechnical, setShowTechnical] = useState(false);

  // Group genomes by origin tier
  const { eliteFamily, exploration, sorted } = useMemo(() => {
    const all = [...genomes].sort((a, b) => {
      if (a.fitness < 0 && b.fitness < 0) return 0;
      if (a.fitness < 0) return 1;
      if (b.fitness < 0) return -1;
      return b.fitness - a.fitness;
    });

    const ef: GenomeRow[] = [];
    const ex: GenomeRow[] = [];
    for (const g of genomes) {
      if (g.origin === 'replication' || g.origin === 'elite_mutation' || g.origin === 'elite_crossover') {
        ef.push(g);
      } else {
        ex.push(g);
      }
    }
    // Sort elite family: replication first, then elite_mutation, then elite_crossover
    const originOrder: Record<string, number> = { replication: 0, elite_mutation: 1, elite_crossover: 2 };
    ef.sort((a, b) => (originOrder[a.origin] ?? 3) - (originOrder[b.origin] ?? 3));
    // Sort exploration by fitness descending
    ex.sort((a, b) => {
      if (a.fitness < 0 && b.fitness < 0) return 0;
      if (a.fitness < 0) return 1;
      if (b.fitness < 0) return -1;
      return b.fitness - a.fitness;
    });

    return { eliteFamily: ef, exploration: ex, sorted: all };
  }, [genomes]);

  // Evaluate selected genome's swing
  const swingData = useMemo(() => {
    if (!genome) return null;
    return describeSwingFromTree(genome.treeJson, windX, windZ);
  }, [genome, windX, windZ]);

  // Parse tree for technical view
  const parsedTree = useMemo(() => {
    if (!genome) return null;
    return parseTree(genome.treeJson);
  }, [genome]);

  // Evolution summary
  const summary = useMemo(() => evolutionSummary(genomes), [genomes]);

  // Elite distance (for delta display)
  const eliteDistance = useMemo(() => {
    const elite = genomes.find(g => g.isElite);
    if (!elite || elite.fitness <= 0) return null;
    return fitnessToDistance(elite.fitness);
  }, [genomes]);

  // Curve label from spin_x
  const curveLabel = (spinX: number): string => {
    if (spinX < -0.4) return 'heavy draw';
    if (spinX < -0.15) return 'draw';
    if (spinX > 0.4) return 'heavy fade';
    if (spinX > 0.15) return 'fade';
    return 'straight';
  };

  // Spin label from spin_z
  const spinLabel = (spinZ: number): string => {
    if (spinZ < -0.3) return 'backspin';
    if (spinZ > 0.3) return 'topspin';
    return 'neutral';
  };

  // Distance display logic
  const distanceDisplay = useMemo(() => {
    const dist = selectedDistance ?? bestDistance;
    if (dist == null) return null;
    const showBest = selectedDistance != null && bestDistance != null
      && Math.abs(selectedDistance - bestDistance) > 0.05;
    return { dist, showBest, bestDist: bestDistance };
  }, [selectedDistance, bestDistance]);

  const isInspecting = inspectedPlayerName != null;

  // Has elite family (i.e., not gen 1 with all random)
  const hasEliteFamily = eliteFamily.length > 0;

  // Compute elite delta for selected genome
  const eliteDelta = useMemo(() => {
    if (!genome || eliteDistance == null) return null;
    if (genome.isElite) return null;
    if (genome.origin !== 'elite_mutation' && genome.origin !== 'elite_crossover') return null;
    const genomeDist = fitnessToDistance(genome.fitness);
    if (genomeDist == null) return null;
    return genomeDist - eliteDistance; // positive = further, negative = closer
  }, [genome, eliteDistance]);

  /** Render a single genome dot */
  function GenomeDot({ g, size }: { g: GenomeRow; size: number }) {
    const isSelected = g.genomeId === selectedGenomeId;
    const originColor = colorForOrigin(g.origin);
    const dist = fitnessToDistance(g.fitness);
    return (
      <div
        onClick={() => onSelectGenome(g.genomeId === selectedGenomeId ? null : g.genomeId)}
        title={`#${g.genomeId} · ${g.origin}${g.isElite ? ' · elite' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: g.isElite ? '#ffd700' : originColor,
          border: isSelected ? '2px solid white' : '2px solid transparent',
          opacity: g.fitness < 0 ? 0.3 : 0.85,
          transition: 'border 0.15s, opacity 0.15s',
          boxShadow: isSelected ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size < 16 ? 7 : 8,
          lineHeight: 1,
        }}>
          {g.isElite && <span style={{ color: '#000', fontWeight: 900 }}>★</span>}
        </div>
        {dist != null && (
          <span style={{ fontSize: 9, opacity: 0.5, lineHeight: 1, whiteSpace: 'nowrap' }}>
            {dist.toFixed(1)}
          </span>
        )}
        {g.origin === 'elite_crossover' && g.parentBId > 0 && (
          <span style={{ fontSize: 8, opacity: 0.35, lineHeight: 1 }}>
            ×#{g.parentBId}
          </span>
        )}
      </div>
    );
  }

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
      <div className="ui-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Swing Lab</span>
        <button
          onClick={() => setShowTechnical(prev => !prev)}
          title={showTechnical ? 'Friendly view' : 'Technical view'}
          style={{
            background: showTechnical ? 'rgba(102,204,255,0.2)' : 'transparent',
            border: '1px solid rgba(102,204,255,0.3)',
            borderRadius: 4,
            color: showTechnical ? '#66ccff' : 'rgba(224,232,240,0.5)',
            fontSize: 10,
            padding: '1px 5px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s',
          }}
        >
          {showTechnical ? 'DNA' : 'DNA'}
        </button>
      </div>

      {/* Inspecting another player banner */}
      {isInspecting && (
        <div style={{
          padding: '4px 10px',
          fontSize: 11,
          background: 'rgba(102,204,255,0.1)',
          borderBottom: '1px solid rgba(102,204,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: '#66ccff' }}>
            Inspecting {inspectedPlayerName}'s swing
          </span>
          <button
            onClick={onClearInspection}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(224,232,240,0.5)',
              cursor: 'pointer',
              fontSize: 12,
              padding: '0 2px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Detail view for selected genome */}
      {genome && swingData ? (
        <>
          {showTechnical ? (
            /* Technical view */
            <div style={{ padding: '8px 10px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#e0e8f0', fontWeight: 600 }}>
                  #{genome.genomeId}
                </span>
                {genome.isElite && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#ffd700',
                    background: 'rgba(255,215,0,0.15)',
                    padding: '1px 5px',
                    borderRadius: 3,
                  }}>ELITE</span>
                )}
                <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }}>
                  Depth {genome.treeDepth} · {genome.nodeCount} nodes
                </span>
              </div>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
                Origin: {originDetail(genome.origin, genome.parentAId, genome.parentBId)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>
                Fitness: {genome.fitness < 0 ? 'unevaluated' : genome.fitness.toFixed(4)}
              </div>
              {/* Tree visualization */}
              {parsedTree && (
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 10,
                  lineHeight: 1.4,
                  color: '#8090a0',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 4,
                  padding: '6px 8px',
                  maxHeight: 160,
                  overflowY: 'auto',
                  whiteSpace: 'pre',
                }}>
                  {renderTreeText(parsedTree)}
                </div>
              )}
            </div>
          ) : (
            /* Friendly view */
            <>
              {/* English description */}
              <div style={{
                padding: '8px 10px',
                fontSize: 14,
                fontWeight: 600,
                color: '#e0e8f0',
                lineHeight: 1.3,
                borderBottom: '1px solid rgba(102,204,255,0.1)',
                marginBottom: 8,
              }}>
                "{swingData.description}"
                {isAutoSelected && (
                  <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.5, marginLeft: 6 }}>(best)</span>
                )}
              </div>

              {/* Param bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '0 4px', marginBottom: 8 }}>
                <ParamBar
                  label="Angle"
                  value={swingData.params.launch_angle}
                  min={8} max={60}
                  unit={`${Math.round(swingData.params.launch_angle)} deg`}
                  color="#ffd700"
                />
                <ParamBar
                  label="Power"
                  value={swingData.params.power}
                  min={0} max={1}
                  unit={`${Math.round(swingData.params.power * 100)}%`}
                  color="#ff55aa"
                />
                <ParamBar
                  label="Curve"
                  value={(swingData.params.spin_x + 1) / 2}
                  min={0} max={1}
                  unit={curveLabel(swingData.params.spin_x)}
                  color="#44ffaa"
                />
                <ParamBar
                  label="Spin"
                  value={(swingData.params.spin_z + 1) / 2}
                  min={0} max={1}
                  unit={spinLabel(swingData.params.spin_z)}
                  color="#66ccff"
                />
              </div>
            </>
          )}

          {/* Context line (shared between both views) */}
          <div style={{
            padding: '6px 10px',
            borderTop: '1px solid rgba(102,204,255,0.1)',
            borderBottom: '1px solid rgba(102,204,255,0.1)',
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 12, color: '#e0e8f0' }}>
              {genNumber != null && <>Gen {genNumber}</>}
              {distanceDisplay && (
                <span style={{ color: distanceDisplay.dist < 5 ? '#ffd700' : '#8090a0' }}>
                  {' '}&mdash; {distanceDisplay.dist.toFixed(1)} yds to hole
                  {distanceDisplay.showBest && (
                    <span style={{ fontSize: 10, opacity: 0.6 }}>
                      {' '}(best: {distanceDisplay.bestDist!.toFixed(1)})
                    </span>
                  )}
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              {genome.isElite && (
                <span style={{
                  color: '#ffd700',
                  fontWeight: 700,
                  fontSize: 9,
                  background: 'rgba(255,215,0,0.15)',
                  padding: '0 4px',
                  borderRadius: 2,
                }}>ELITE</span>
              )}
              {originNarrative(genome.origin)}
            </div>
            {/* Elite delta for elite-derived genomes */}
            {eliteDelta != null && (
              <div style={{
                fontSize: 10,
                marginTop: 3,
                color: eliteDelta < 0 ? '#44ffaa' : '#ff5555',
                fontWeight: 600,
              }}>
                {eliteDelta < 0
                  ? `${Math.abs(eliteDelta).toFixed(1)} yds closer than elite`
                  : `${eliteDelta.toFixed(1)} yds further than elite`}
              </div>
            )}
            {/* Show partner info for elite crossovers */}
            {genome.origin === 'elite_crossover' && genome.parentBId > 0 && (
              <div style={{ fontSize: 10, opacity: 0.45, marginTop: 2 }}>
                Elite × Partner #{genome.parentBId}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ padding: '8px 10px', marginBottom: 8 }}>
          {sorted.length === 0 ? (
            <div style={{ fontSize: 11, opacity: 0.4, textAlign: 'center' }}>
              No swings yet — click Tee Off
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#e0e8f0', marginBottom: 4 }}>
                {genNumber != null && <>Gen {genNumber}</>}
                {distanceDisplay && (
                  <span style={{ color: distanceDisplay.dist < 5 ? '#ffd700' : '#8090a0' }}>
                    {' '}&mdash; {distanceDisplay.dist.toFixed(1)} yds to hole
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, opacity: 0.4 }}>
                Tap a swing below to inspect
              </div>
            </>
          )}
        </div>
      )}

      {/* Evolution summary */}
      {summary.text && (
        <div style={{
          padding: '3px 10px',
          fontSize: 11,
          color: summary.color,
          fontWeight: 600,
          marginBottom: 4,
        }}>
          {summary.text}
        </div>
      )}

      {/* Population grid — grouped by tier */}
      {hasEliteFamily ? (
        <div style={{ padding: '4px 6px', marginBottom: 8 }}>
          {/* Elite Family tier */}
          <div style={{
            padding: '6px 4px',
            borderBottom: '1px solid rgba(102,204,255,0.08)',
            marginBottom: 4,
          }}>
            <div style={{ fontSize: 9, opacity: 0.35, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              Elite Family
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' }}>
              {eliteFamily.map((g) => (
                <GenomeDot key={g.genomeId} g={g} size={18} />
              ))}
            </div>
          </div>
          {/* Exploration tier */}
          <div style={{ padding: '4px 4px 0' }}>
            <div style={{ fontSize: 9, opacity: 0.35, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              Exploration
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' }}>
              {exploration.map((g) => (
                <GenomeDot key={g.genomeId} g={g} size={14} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Flat grid for gen 1 (all random) */
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: '4px 6px',
          justifyContent: 'center',
          marginBottom: 8,
        }}>
          {sorted.map((g) => (
            <GenomeDot key={g.genomeId} g={g} size={14} />
          ))}
        </div>
      )}

      {/* Sponsor button */}
      <button
        className="ui-btn ui-btn--gold"
        style={{ width: '100%' }}
        onClick={onSponsor}
        disabled={sponsorDisabled || isInspecting}
      >
        {isInspecting ? 'Viewing opponent' : 'Protect This Swing'}
      </button>
    </div>
  );
}
