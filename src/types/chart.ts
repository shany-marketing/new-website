export interface ChartSpec {
  type: "bar" | "line" | "scatter" | "pie" | "composed";
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string | string[];
  xLabel?: string;
  yLabel?: string;
  layout?: "horizontal" | "vertical";
  colors?: string[];
  series?: Array<{
    key: string;
    color: string;
    type?: "bar" | "line" | "area";
  }>;
}
