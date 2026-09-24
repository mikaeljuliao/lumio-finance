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
        {/* Fluxo Diário Area Chart (7 Cols Desktop, Full Width Mobile/Tablet) */}
        <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 min-w-0 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
            <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                Evolução Diária de Gastos
              </h3>
              <p className="text-xs text-zinc-400">
                Acompanhamento dos picos e comportamento de saídas no mês
              </p>
            </div>
          </div>

          <div className="h-[200px] sm:h-[250px] md:h-[280px] w-full min-w-0 pt-2">
            {hasTimelineData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dataTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      borderRadius: "12px",
                      color: "#ffffff",
                      fontSize: "12px"
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
                Sem dados de timeline no período selecionado
              </div>
            )}
          </div>
        </div>

        {/* Distribuição por Categoria Donut Chart (5 Cols Desktop, Full Width Mobile/Tablet) */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 min-w-0 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
            <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20 shrink-0">
              <PieIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                Maiores Gastos por Categoria
              </h3>
              <p className="text-xs text-zinc-400">
                Proporção dos maiores custos acumulados
              </p>
            </div>
          </div>

          <div className="h-[180px] sm:h-[220px] w-full min-w-0">
            {hasCategoryData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.dataCategoria}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
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
                      color: "#ffffff",
                      fontSize: "12px"
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
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 pt-3 border-t border-zinc-800/60">
              {stats.dataCategoria.slice(0, 4).map((cat, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-xs font-semibold text-zinc-300 capitalize truncate">
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
