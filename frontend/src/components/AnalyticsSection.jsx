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
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 space-y-2 sm:space-y-3 min-w-0 flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
            <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/20 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                Evolução Diária de Gastos
              </h3>
              <p className="text-[11px] text-zinc-400">
                Acompanhamento dos picos e comportamento de saídas no mês
              </p>
            </div>
          </div>

          <div className="h-[110px] sm:h-[130px] md:h-[140px] w-full min-w-0 pt-1">
            {hasTimelineData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dataTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
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
                    tick={{ fill: "#a1a1aa", fontSize: 9, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontSize: "11px"
                    }}
                    itemStyle={{ color: "#10b981" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                Sem dados de timeline no período selecionado
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 space-y-2 sm:space-y-3 min-w-0 flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
            <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/20 shrink-0">
              <PieIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                Maiores Gastos por Categoria
              </h3>
              <p className="text-[11px] text-zinc-400">
                Proporção dos maiores custos acumulados
              </p>
            </div>
          </div>

          <div className="h-[100px] sm:h-[110px] w-full min-w-0">
            {hasCategoryData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.dataCategoria}
                    innerRadius={26}
                    outerRadius={38}
                    paddingAngle={4}
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
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontSize: "11px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                Nenhum gasto registrado para categorização
              </div>
            )}
          </div>

          {hasCategoryData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5 pt-2 border-t border-zinc-800/60">
              {stats.dataCategoria.slice(0, 4).map((cat, i) => (
                <div key={i} className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-[11px] font-semibold text-zinc-300 capitalize truncate">
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
