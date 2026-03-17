import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type GenStat = { genNumber: number; bestFitness: number; avgFitness: number };

type FitnessChartProps = {
  generations: GenStat[];
};

export default function FitnessChart({ generations }: FitnessChartProps) {
  if (generations.length === 0) return null;

  return (
    <div
      className="ui-panel"
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 10,
        width: 280,
        height: 180,
        padding: '8px 4px 4px 4px',
      }}
    >
      <div className="ui-panel-header" style={{ padding: '0 8px', marginBottom: 4 }}>Fitness</div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={generations} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="rgba(102,204,255,0.08)" />
          <XAxis
            dataKey="genNumber"
            tick={{ fill: '#8090a0', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(102,204,255,0.15)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8090a0', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(102,204,255,0.15)' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(8,24,40,0.95)',
              border: '1px solid rgba(102,204,255,0.3)',
              borderRadius: 6,
              fontSize: 11,
              color: '#e0e8f0',
            }}
          />
          <Line
            type="monotone"
            dataKey="bestFitness"
            stroke="#ffd700"
            strokeWidth={2}
            dot={false}
            name="Best"
          />
          <Line
            type="monotone"
            dataKey="avgFitness"
            stroke="#66ccff"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            name="Avg"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
