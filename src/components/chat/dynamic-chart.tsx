"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartSpec } from "@/types/chart";

const DEFAULT_COLORS = [
  "#C9A86A",
  "#516B84",
  "#4A8F6B",
  "#B85050",
  "#ff8c42",
  "#7e93b2",
  "#a78bfa",
  "#f472b6",
];

const tooltipStyle = {
  backgroundColor: "rgba(19, 34, 56, 0.95)",
  border: "1px solid var(--glass-border)",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "13px",
};

interface DynamicChartProps {
  spec: ChartSpec;
}

export default function DynamicChart({ spec }: DynamicChartProps) {
  const colors = spec.colors ?? DEFAULT_COLORS;
  const yKeys = Array.isArray(spec.yKey) ? spec.yKey : [spec.yKey];

  const commonAxisProps = {
    tick: { fill: "#7e93b2", fontSize: 12 },
    axisLine: { stroke: "var(--glass-border)" },
    tickLine: false,
  };

  if (spec.type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={spec.data}
            dataKey={yKeys[0]}
            nameKey={spec.xKey}
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={{ stroke: "var(--text-tertiary)" }}
          >
            {spec.data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            wrapperStyle={{ color: "#7e93b2", fontSize: "12px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "scatter") {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" />
          <XAxis
            dataKey={spec.xKey}
            name={spec.xLabel ?? spec.xKey}
            {...commonAxisProps}
          />
          <YAxis
            dataKey={yKeys[0]}
            name={spec.yLabel ?? yKeys[0]}
            {...commonAxisProps}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Scatter data={spec.data} fill={colors[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" />
          <XAxis dataKey={spec.xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={tooltipStyle} />
          {yKeys.length > 1 && (
            <Legend wrapperStyle={{ color: "#7e93b2", fontSize: "12px" }} />
          )}
          {yKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[i % colors.length], r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "composed" && spec.series) {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" />
          <XAxis dataKey={spec.xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ color: "#7e93b2", fontSize: "12px" }} />
          {spec.series.map((s) => {
            if (s.type === "line") {
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                />
              );
            }
            if (s.type === "area") {
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  fill={s.color}
                  fillOpacity={0.2}
                  stroke={s.color}
                />
              );
            }
            return (
              <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart
  const isHorizontal = spec.layout === "horizontal";
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={spec.data}
        layout={isHorizontal ? "vertical" : "horizontal"}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" />
        {isHorizontal ? (
          <>
            <XAxis type="number" {...commonAxisProps} />
            <YAxis
              dataKey={spec.xKey}
              type="category"
              width={120}
              {...commonAxisProps}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={spec.xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle} />
        {yKeys.length > 1 && (
          <Legend wrapperStyle={{ color: "#7e93b2", fontSize: "12px" }} />
        )}
        {yKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[i % colors.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
