import { useState, useMemo } from "react";
import { SlidersHorizontal, AlertTriangle, CheckCircle2, AlertOctagon } from "lucide-react";
import { CATEGORIES } from "../lib/constants";
import { formatCurrency } from "../lib/utils";

export function CategoryHealth({ stats, limits, onOpenLimitModal }) {
  const [filterMode, setFilterMode] = useState("all");

  const categoryList = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const spent = stats.porCategoria[cat.id] || 0;
      const limit = limits[cat.id] || 0;
      const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      return {
        ...cat,
        spent,
        limit,
        percentage,
        hasLimit: limit > 0,
        isAlert: limit > 0 && percentage >= 80,
        isOver: limit > 0 && percentage >= 100
      };
    });
  }, [stats.porCategoria, limits]);

  const filteredCategories = useMemo(() => {
    if (filterMode === "limits") {
      return categoryList.filter((c) => c.hasLimit);
    }
    if (filterMode === "alerts") {
      return categoryList.filter((c) => c.isAlert);
    }
    return categoryList;
  }, [categoryList, filterMode]);

  return (
    <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Limites por Categoria
            </h3>
            <p className="text-xs text-zinc-400">
              Acompanhamento mensal de metas e teto de gastos
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800/80 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === "all"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterMode("limits")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === "limits"
                ? "bg-zinc-800 text-emerald-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Com Limite
          </button>
          <button
            onClick={() => setFilterMode("alerts")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === "alerts"
                ? "bg-zinc-800 text-amber-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Alertas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const getBarColor = () => {
            if (!cat.hasLimit) return "bg-zinc-700";
            if (cat.percentage >= 100) return "bg-red-500";
            if (cat.percentage >= 80) return "bg-amber-500";
            return "bg-emerald-500";
          };

          const getBadgeIcon = () => {
            if (!cat.hasLimit) return null;
            if (cat.percentage >= 100)
              return <AlertOctagon className="w-3.5 h-3.5 text-red-400" />;
            if (cat.percentage >= 80)
              return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
            return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
          };

          return (
            <div
              key={cat.id}
              onClick={() => onOpenLimitModal(cat.id, cat.limit)}
              className="group bg-zinc-950/60 hover:bg-zinc-800/50 border border-zinc-800/80 p-4 rounded-2xl cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-xs font-bold text-zinc-300 capitalize group-hover:text-white transition-colors">
                    {cat.id}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  {getBadgeIcon()}
                  <span className="text-zinc-400">
                    {cat.hasLimit ? `${cat.percentage.toFixed(0)}%` : "Sem teto"}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-base font-black text-white">
                  {formatCurrency(cat.spent)}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {cat.hasLimit ? `Meta: ${formatCurrency(cat.limit)}` : "Clique p/ definir"}
                </span>
              </div>

              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getBarColor()}`}
                  style={{ width: `${cat.hasLimit ? cat.percentage : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
