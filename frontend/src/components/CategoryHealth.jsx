import { useState, useMemo } from "react";
import { SlidersHorizontal, AlertTriangle, CheckCircle2, AlertOctagon, Plus } from "lucide-react";
import { CATEGORIES } from "../lib/constants";
import { formatCurrency } from "../lib/utils";

const WARNING_THRESHOLD_PERCENTAGE = 80;
const MAX_PROGRESS_PERCENTAGE = 100;

const FILTER_MODES = {
  ALL: "all",
  WITH_LIMITS: "limits",
  ALERTS: "alerts"
};

function getProgressBarColor(category) {
  if (!category.hasSpendingLimit) return "bg-zinc-700";
  if (category.isLimitExceeded) return "bg-red-500";
  if (category.isNearLimit) return "bg-amber-500";
  return "bg-emerald-500";
}

function getCategoryStatusIcon(category) {
  if (!category.hasSpendingLimit) return null;
  if (category.isLimitExceeded) {
    return <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  }
  if (category.isNearLimit) {
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }
  return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
}

function CategoryHealthCard({ category, onSelectCategory }) {
  const isBudgetExceeded = category.remainingAmount < 0;

  return (
    <div
      onClick={() => onSelectCategory(category.id, category.spendingLimit)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectCategory(category.id, category.spendingLimit);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Editar limite de ${category.id}`}
      className="group bg-zinc-950/70 hover:bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 p-3.5 rounded-2xl cursor-pointer transition-all space-y-2.5 min-w-0"
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{category.icon}</span>
          <span className="text-xs font-bold text-zinc-200 capitalize truncate group-hover:text-white transition-colors">
            {category.id}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold shrink-0">
          {getCategoryStatusIcon(category)}
          <span className="text-zinc-400">
            {category.hasSpendingLimit ? `${category.usagePercentage.toFixed(0)}%` : "Sem teto"}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-base font-black text-white tracking-tight truncate">
            {formatCurrency(category.spentAmount)}
          </span>
          <span className="text-xs text-zinc-400 font-medium shrink-0">
            {category.hasSpendingLimit ? `Limite: ${formatCurrency(category.spendingLimit)}` : ""}
          </span>
        </div>

        {category.hasSpendingLimit ? (
          <div className="text-[11px] font-medium text-zinc-400 flex justify-between">
            <span>
              {isBudgetExceeded ? "Excedido:" : "Restante:"}
            </span>
            <strong className={isBudgetExceeded ? "text-red-400" : "text-emerald-400"}>
              {formatCurrency(Math.abs(category.remainingAmount))}
            </strong>
          </div>
        ) : (
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 group-hover:underline">
            <Plus className="w-3 h-3" /> Definir limite
          </div>
        )}
      </div>

      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${getProgressBarColor(category)}`}
          style={{ width: `${category.hasSpendingLimit ? category.usagePercentage : 0}%` }}
        />
      </div>
    </div>
  );
}

export function CategoryHealth({ stats, limits, onOpenLimitModal }) {
  const [filterMode, setFilterMode] = useState(FILTER_MODES.ALL);

  const categoriesWithMetrics = useMemo(() => {
    const categoryTotals = stats.byCategory || stats.porCategoria || {};
    return CATEGORIES.map((category) => {
      const spentAmount = categoryTotals[category.id] || 0;
      const spendingLimit = limits[category.id] || 0;
      const hasSpendingLimit = spendingLimit > 0;
      const remainingAmount = hasSpendingLimit ? spendingLimit - spentAmount : null;
      const usagePercentage = hasSpendingLimit
        ? Math.min((spentAmount / spendingLimit) * 100, MAX_PROGRESS_PERCENTAGE)
        : 0;
      const isNearLimit =
        hasSpendingLimit &&
        usagePercentage >= WARNING_THRESHOLD_PERCENTAGE &&
        usagePercentage < MAX_PROGRESS_PERCENTAGE;
      const isLimitExceeded = hasSpendingLimit && usagePercentage >= MAX_PROGRESS_PERCENTAGE;

      return {
        ...category,
        spentAmount,
        spendingLimit,
        remainingAmount,
        usagePercentage,
        hasSpendingLimit,
        isNearLimit,
        isLimitExceeded
      };
    });
  }, [stats.byCategory, stats.porCategoria, limits]);

  const displayedCategories = useMemo(() => {
    if (filterMode === FILTER_MODES.WITH_LIMITS) {
      return categoriesWithMetrics.filter((category) => category.hasSpendingLimit);
    }
    if (filterMode === FILTER_MODES.ALERTS) {
      return categoriesWithMetrics.filter(
        (category) => category.isNearLimit || category.isLimitExceeded
      );
    }
    return categoriesWithMetrics;
  }, [categoriesWithMetrics, filterMode]);

  const categoriesWithLimitCount = useMemo(
    () => categoriesWithMetrics.filter((category) => category.hasSpendingLimit).length,
    [categoriesWithMetrics]
  );

  const categoriesInAlertCount = useMemo(
    () =>
      categoriesWithMetrics.filter(
        (category) => category.isNearLimit || category.isLimitExceeded
      ).length,
    [categoriesWithMetrics]
  );

  const hasAnyCategoryWithLimit = categoriesWithLimitCount > 0;
  const isAlertFilterActive = filterMode === FILTER_MODES.ALERTS;

  return (
    <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5">
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
              Controle do que você pretende gastar em cada categoria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950/80 border border-zinc-800/80 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilterMode(FILTER_MODES.ALL)}
            aria-pressed={filterMode === FILTER_MODES.ALL}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === FILTER_MODES.ALL
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Todas ({categoriesWithMetrics.length})
          </button>
          <button
            onClick={() => setFilterMode(FILTER_MODES.WITH_LIMITS)}
            aria-pressed={filterMode === FILTER_MODES.WITH_LIMITS}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === FILTER_MODES.WITH_LIMITS
                ? "bg-zinc-800 text-emerald-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Com Limite ({categoriesWithLimitCount})
          </button>
          <button
            onClick={() => setFilterMode(FILTER_MODES.ALERTS)}
            aria-pressed={filterMode === FILTER_MODES.ALERTS}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === FILTER_MODES.ALERTS
                ? "bg-zinc-800 text-amber-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Alertas ({categoriesInAlertCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {displayedCategories.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-8 text-center" aria-live="polite">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 text-emerald-400">
              {isAlertFilterActive && hasAnyCategoryWithLimit ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <SlidersHorizontal className="h-5 w-5" />
              )}
            </div>
            <p className="mt-3 text-sm font-bold text-zinc-200">
              {isAlertFilterActive && hasAnyCategoryWithLimit
                ? "Nenhum limite em alerta"
                : "Nenhum limite por categoria definido"}
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-400">
              {isAlertFilterActive && hasAnyCategoryWithLimit
                ? "Todas as categorias estão abaixo de 80% do limite."
                : "Veja as categorias e escolha onde quer definir um limite mensal."}
            </p>
            <button
              type="button"
              onClick={() => setFilterMode(FILTER_MODES.ALL)}
              className="mt-4 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Ver todas as categorias
            </button>
          </div>
        ) : (
          displayedCategories.map((category) => (
            <CategoryHealthCard
              key={category.id}
              category={category}
              onSelectCategory={onOpenLimitModal}
            />
          ))
        )}
      </div>
    </section>
  );
}
