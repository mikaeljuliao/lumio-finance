import { TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { CHART_COLORS } from "../lib/constants";

export function ChartsSection({ stats }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Fluxo Diário Area Chart */}
      <section className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 p-8 rounded-[2.5rem]">
        <h2 className="text-xl font-black text-white italic uppercase mb-10 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" /> Fluxo Diário
        </h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.dataTimeline}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "#27272a",
                  borderRadius: "16px"
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={4}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Gastos por Categoria Pie Chart */}
      <section className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[2.5rem]">
        <h2 className="text-xl font-black text-white italic uppercase mb-10 flex items-center gap-3">
          <PieChartIcon className="w-5 h-5 text-emerald-500" /> Gastos por Categoria
        </h2>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.dataCategoria}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {stats.dataCategoria.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "#27272a",
                  borderRadius: "12px"
                }}
                itemStyle={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  textTransform: "uppercase"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {stats.dataCategoria.slice(0, 4).map((cat, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-[10px] font-bold text-zinc-500 uppercase truncate">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
