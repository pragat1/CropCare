import { memo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ActivityPoint = { name: string; healthy: number; diseased: number };
export type SlicePoint = { name: string; value: number };

const tooltipProps = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    fontSize: "12px",
    color: "var(--foreground)",
  },
  cursor: { fill: "var(--muted)", opacity: 0.35 },
} as const;

/** Daily scan activity built from real detection timestamps. */
export const ActivityChart = memo(function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gHealthy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gDiseased" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.45} />
              <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            minTickGap={16}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--muted-foreground)"
          />
          <Tooltip {...tooltipProps} />
          <Area
            type="monotone"
            dataKey="healthy"
            name="Healthy"
            stroke="var(--primary)"
            fill="url(#gHealthy)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="diseased"
            name="Diseased"
            stroke="var(--destructive)"
            fill="url(#gDiseased)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

/** Disease distribution — rendered only when diseases exist. */
export const DistributionChart = memo(function DistributionChart({ data }: { data: SlicePoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={`color-mix(in oklab, var(--primary) ${100 - i * 13}%, var(--muted))`}
              />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Tooltip {...tooltipProps} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
