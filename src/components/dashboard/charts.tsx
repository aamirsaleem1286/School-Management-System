"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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

const COLORS = {
  secondary: "#4f5bd5",
  accent: "#14b8a6",
  success: "#22a06b",
  warning: "#f59e0b",
  destructive: "#ef4444",
  info: "#2f9ee8",
  muted: "#94a3b8",
};

const PIE_COLORS = [COLORS.secondary, COLORS.accent, COLORS.warning, COLORS.info, COLORS.success, COLORS.destructive, "#8b5cf6"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
};

export function CollectionChart({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="collectionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.secondary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.secondary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`PKR ${Number(value).toLocaleString()}`, "Collected"]}
        />
        <Area type="monotone" dataKey="amount" stroke={COLORS.secondary} strokeWidth={2.5} fill="url(#collectionFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AttendanceChart({ data }: { data: { day: string; present: number; absent: number; late: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barSize={16}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="present" name="Present" stackId="a" fill={COLORS.success} radius={[0, 0, 0, 0]} />
        <Bar dataKey="late" name="Late" stackId="a" fill={COLORS.warning} />
        <Bar dataKey="absent" name="Absent" stackId="a" fill={COLORS.destructive} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ClassChart({ data }: { data: { name: string; students: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={70}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="students" name="Students" fill={COLORS.accent} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExpensePie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={2} strokeWidth={0}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `PKR ${Number(value).toLocaleString()}`} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
