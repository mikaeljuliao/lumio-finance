import { ArrowUpRight, ArrowDownRight, Target, Receipt, CalendarDays } from "lucide-react";
import { formatCurrency } from "../lib/utils";

export function OverviewBanner({
  stats,
  limits,
  totalRecords,
  onOpenLimitModal
}) {
  const generalLimit = limits.geral || 2000;
  const usedPercentage = Math.min((stats.total / generalLimit) * 100, 100);
  const remainingBudget = Math.max(generalLimit - stats.total, 0);

  const getLimitBadge = () => {
    if (usedPercentage >= 100) {
      return {
        label: "Limite Atingido",
        color: "bg-red-500/10 text-red-400 border-red-500/20",
        barColor: "bg-red-500"
      };
    }
    if (usedPercentage >= 80) {
      return {
        label: "Atenção (80%+)",
        color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        barColor: "bg-amber-500"
      };
    }
    return {
      label: "Dentro do Alvo",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      barColor: "bg-emerald-500"
    };
  };

  const status = getLimitBadge();

  return (
    <section className="bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Main Hero Metrics (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-400" /> Total Gasto no Mês
            </span>
            <div
              onClick={() => onOpenLimitModal("geral", limits.geral || 0)}
              className={`cursor-pointer px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all hover:opacity-80 ${status.color}`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{status.label}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {formatCurrency(stats.total)}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${
                    stats.diff > 0
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {stats.diff > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(stats.diff).toFixed(1)}% vs mês anterior
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  Ref: {formatCurrency(stats.totalAnterior)}
                </span>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 border-zinc-800/80 pt-3 sm:pt-0">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
                Média Diária
              </span>
              <span className="text-xl font-bold text-zinc-200">
                {formatCurrency(stats.media)}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                {totalRecords} {totalRecords === 1 ? "lançamento" : "lançamentos"}
              </span>
            </div>
          </div>
        </div>

        {/* General Budget Card (Col 5) */}
        <div className="lg:col-span-5 bg-zinc-950/60 border border-zinc-800/90 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" /> Teto Geral da Carteira
            </span>
            <button
              onClick={() => onOpenLimitModal("geral", limits.geral || 0)}
              className="text-[11px] text-emerald-400 font-bold hover:underline"
            >
              Ajustar
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {formatCurrency(generalLimit)}
            </span>
            <span className="text-xs font-bold text-zinc-400">
              {usedPercentage.toFixed(0)}% Utilizado
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${status.barColor}`}
              style={{ width: `${usedPercentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-zinc-400 font-medium pt-1">
            <span>Disponível: <strong className="text-emerald-400 font-bold">{formatCurrency(remainingBudget)}</strong></span>
            <span>Gasto: <strong className="text-zinc-200">{formatCurrency(stats.total)}</strong></span>
          </div>
        </div>
      </div>
    </section>
  );
}
