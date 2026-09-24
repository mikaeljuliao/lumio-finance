import { TrendingUp, PieChart as PieIcon } from "lucide-react";
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

export function AnalyticsSection({ stats }) {
  const hasTimelineData = stats.dataTimeline && stats.dataTimeline.length > 0;
  const hasCategoryData = stats.dataCategoria && stats.dataCategoria.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Fluxo Diário Chart (Col 7) */}
      <section className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-zinc-800/80">
          <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Fluxo de Gastos Diários
            </h3>
            <p className="text-xs text-zinc-400">
              Evolução dos lançamentos ao longo do mês
            </p>
          </div>
        </div>

        <div className="h-[260px] w-full pt-4">
          {hasTimelineData ? (
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
                  tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderColor: "#27272a",
                    borderRadius: "12px",
                    color: "#ffffff"
                  }}
                  itemStyle={{ color: "#10b981" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              Sem dados suficientes no período selecionado
            </div>
          )}
        </div>
      </section>

      {/* Distribuição por Categoria (Col 5) */}
      <section className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-zinc-800/80">
          <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Distribuição por Categoria
            </h3>
            <p className="text-xs text-zinc-400">
              Proporção dos maiores gastos no mês
            </p>
          </div>
        </div>

        <div className="h-[200px] w-full">
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.dataCategoria}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={6}
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
                    borderRadius: "12px",
                    color: "#ffffff"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              Nenhum gasto categorizado
            </div>
          )}
        </div>

        {hasCategoryData && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60">
            {stats.dataCategoria.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-xs font-semibold text-zinc-300 capitalize truncate">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
