import { useState, useMemo } from "react";
import { SlidersHorizontal, AlertTriangle, CheckCircle2, AlertOctagon, Plus } from "lucide-react";
import { CATEGORIES } from "../lib/constants";
import { formatCurrency } from "../lib/utils";

export function CategoryHealth({ stats, limits, onOpenLimitModal }) {
  const [filterMode, setFilterMode] = useState("all");

  const categoryList = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const spent = stats.porCategoria[cat.id] || 0;
      const limit = limits[cat.id] || 0;
      const remaining = limit > 0 ? limit - spent : null;
      const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      return {
        ...cat,
        spent,
        limit,
        remaining,
        percentage,
        hasLimit: limit > 0,
        isAlert: limit > 0 && percentage >= 80 && percentage < 100,
        isOver: limit > 0 && percentage >= 100
      };
    });
  }, [stats.porCategoria, limits]);

  const filteredCategories = useMemo(() => {
    if (filterMode === "limits") {
      return categoryList.filter((c) => c.hasLimit);
    }
    if (filterMode === "alerts") {
      return categoryList.filter((c) => c.isAlert || c.isOver);
    }
    return categoryList;
  }, [categoryList, filterMode]);

  return (
    <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20 shrink-0">
            <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
              Limites por Categoria
            </h3>
            <p className="text-xs text-zinc-400">
              Acompanhamento de metas por área
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-950/80 border border-zinc-800/80 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === "all"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Todas ({categoryList.length})
          </button>
          <button
            onClick={() => setFilterMode("limits")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === "limits"
                ? "bg-zinc-800 text-emerald-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Com Limite ({categoryList.filter((c) => c.hasLimit).length})
          </button>
          <button
            onClick={() => setFilterMode("alerts")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === "alerts"
                ? "bg-zinc-800 text-amber-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Alertas ({categoryList.filter((c) => c.isAlert || c.isOver).length})
          </button>
        </div>
      </div>

      {/* Categories Cards Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {filteredCategories.map((cat) => {
          const getBarColor = () => {
            if (!cat.hasLimit) return "bg-zinc-700";
            if (cat.isOver) return "bg-red-500";
            if (cat.isAlert) return "bg-amber-500";
            return "bg-emerald-500";
          };

          const getBadgeIcon = () => {
            if (!cat.hasLimit) return null;
            if (cat.isOver)
              return <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />;
            if (cat.isAlert)
              return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
            return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
          };

          return (
            <div
              key={cat.id}
              onClick={() => onOpenLimitModal(cat.id, cat.limit)}
              className="group bg-zinc-950/70 hover:bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 p-3.5 rounded-2xl cursor-pointer transition-all space-y-2.5 min-w-0"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <span className="text-xs font-bold text-zinc-200 capitalize truncate group-hover:text-white transition-colors">
                    {cat.id}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold shrink-0">
                  {getBadgeIcon()}
                  <span className="text-zinc-400">
                    {cat.hasLimit ? `${cat.percentage.toFixed(0)}%` : "Sem teto"}
                  </span>
                </div>
              </div>

              {/* Amounts Display */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-black text-white tracking-tight truncate">
                    {formatCurrency(cat.spent)}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium shrink-0">
                    {cat.hasLimit ? `Meta: ${formatCurrency(cat.limit)}` : ""}
                  </span>
                </div>

                {cat.hasLimit ? (
                  <div className="text-[11px] font-medium text-zinc-400 flex justify-between">
                    <span>
                      {cat.remaining < 0 ? "Excedido:" : "Restante:"}
                    </span>
                    <strong className={cat.remaining < 0 ? "text-red-400" : "text-emerald-400"}>
                      {formatCurrency(Math.abs(cat.remaining))}
                    </strong>
                  </div>
                ) : (
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 group-hover:underline">
                    <Plus className="w-3 h-3" /> Definir limite
                  </div>
                )}
              </div>

              {/* Progress Bar */}
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
