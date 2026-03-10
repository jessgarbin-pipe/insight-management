"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  open: "hsl(var(--chart-1))",
  related: "hsl(var(--chart-2))",
  closed: "hsl(var(--chart-3))",
  archived: "hsl(var(--chart-5))",
};

interface StatusBreakdownChartProps {
  data: { status: string; count: number }[];
}

export function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  if (data.length === 0 || data.every((d) => d.count === 0)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 max-w-sm mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] || "hsl(var(--chart-4))"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: 12,
                }}
                formatter={(value, name) => [String(value), String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
              />
              <Legend
                formatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
