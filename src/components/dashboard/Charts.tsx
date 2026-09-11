"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TicketStatus } from "@/types";

const STATUS_COLORS: Record<TicketStatus, string> = {
  CREATED: "#6366f1",
  EN_COURSE: "#f59e0b",
  IN_REVIEW: "#8b5cf6",
  REJECTED: "#ef4444",
  TERMINATED: "#10b981",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  CREATED: "Creado",
  EN_COURSE: "En curso",
  IN_REVIEW: "En revisión",
  REJECTED: "Rechazado",
  TERMINATED: "Terminado",
};

interface TicketsByStatusProps {
  data: Record<TicketStatus, number>;
}

export function TicketsByStatusChart({ data }: TicketsByStatusProps) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: STATUS_LABELS[status as TicketStatus],
    value: count,
    color: STATUS_COLORS[status as TicketStatus],
  }));

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "var(--shadow-lg)",
              }}
              itemStyle={{ color: "var(--foreground)" }}
              formatter={(value, name) => [value, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-4 flex-wrap">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
      <div className="text-center mt-4 pt-4 border-t border-border">
        <span className="text-3xl font-bold text-foreground">{total}</span>
        <p className="text-sm text-muted-foreground">Total de tickets</p>
      </div>
    </div>
  );
}

interface AssignedTicketsChartProps {
  data: Record<TicketStatus, number>;
}

export function AssignedTicketsChart({ data }: AssignedTicketsChartProps) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: STATUS_LABELS[status as TicketStatus],
    count,
    fill: STATUS_COLORS[status as TicketStatus],
  }));

  return (
    <div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "var(--shadow-lg)",
              }}
              itemStyle={{ color: "var(--foreground)" }}
              cursor={{ fill: "var(--accent)" }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface RejectedByUserChartProps {
  data: { name: string; count: number }[];
}

export function RejectedByUserChart({ data }: RejectedByUserChartProps) {
  return (
    <div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "var(--shadow-lg)",
              }}
              itemStyle={{ color: "var(--foreground)" }}
              cursor={{ fill: "var(--accent)" }}
            />
            <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface RatingChartProps {
  avgRating: number;
  totalRatings: number;
}

export function RatingChart({ avgRating, totalRatings }: RatingChartProps) {
  const data = [
    { name: "Satisfacción", value: avgRating },
    { name: "Restante", value: 5 - avgRating },
  ];

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="transparent"
            >
              <Cell fill="#10b981" />
              <Cell fill="var(--border)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground">{avgRating.toFixed(1)}</span>
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={star <= Math.round(avgRating) ? "#f59e0b" : "var(--border)"}
                stroke={star <= Math.round(avgRating) ? "#f59e0b" : "var(--border)"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        Basado en {totalRatings} calificaciones
      </p>
    </div>
  );
}
