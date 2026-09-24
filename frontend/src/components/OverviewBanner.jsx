import { ArrowUpRight, ArrowDownRight, Wallet, TrendingDown, PiggyBank, Target, CalendarDays } from "lucide-react";
import { formatCurrency } from "../lib/utils";

export function OverviewBanner({
  stats,
  limits,
  totalRecords,
  onOpenLimitModal
}) {
  const monthlyBudget = limits.geral || 2000;
  const totalSpent = stats.total || 0;
  const remainingBudget = monthlyBudget - totalSpent;
  const usedPercentage = Math.min((totalSpent / monthlyBudget) * 100, 100);
  const isOverBudget = remainingBudget < 0;

  const getStatusBadge = () => {
    if (usedPercentage >= 100 || isOverBudget) {
      return {
        label: "Orçamento Excedido",
        color: "bg-red-500/10 text-red-400 border-red-500/20",
        barColor: "bg-red-500"
      };
    }
    if (usedPercentage >= 80) {
      return {
        label: "Atenção (80%+ Usado)",
        color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        barColor: "bg-amber-500"
      };
    }
    return {
      label: "Dentro do Orçamento",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      barColor: "bg-emerald-500"
    };
  };

  const status = getStatusBadge();

  return (
    <section className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/80 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 space-y-6 shadow-xl backdrop-blur-sm">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20 shrink-0">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
              Resumo Financeiro do Mês
            </h2>
            <p className="text-xs text-zinc-400">
              Visão geral de saídas, saldo disponível e limites
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`px-3 py-1 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-wider ${status.color}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid (4 Columns on Desktop, 2 on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Gasto no Mês */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 p-4 sm:p-5 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Gasto no Mês</span>
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight truncate">
            {formatCurrency(totalSpent)}
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold">
            <span
              className={`inline-flex items-center ${
                stats.diff > 0 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {stats.diff > 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(stats.diff).toFixed(1)}%
            </span>
            <span className="text-zinc-500 font-normal">vs mês anterior</span>
          </div>
        </div>

        {/* Card 2: Saldo Disponível */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 p-4 sm:p-5 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Saldo Disponível</span>
            <PiggyBank className={`w-3.5 h-3.5 ${isOverBudget ? "text-red-400" : "text-emerald-400"}`} />
          </span>
          <div
            className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight truncate ${
              isOverBudget ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {formatCurrency(Math.abs(remainingBudget))}
          </div>
          <p className="text-[10px] sm:text-xs text-zinc-400">
            {isOverBudget ? "Excedido no orçamento" : "Restante do orçamento"}
          </p>
        </div>

        {/* Card 3: Orçamento Mensal */}
        <div
          onClick={() => onOpenLimitModal("geral", monthlyBudget)}
          className="bg-zinc-950/70 hover:bg-zinc-900/60 border border-zinc-800/80 hover:border-emerald-500/40 p-4 sm:p-5 rounded-2xl space-y-2 cursor-pointer transition-all group"
        >
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between group-hover:text-emerald-400 transition-colors">
            <span>Orçamento Mensal</span>
            <Target className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400" />
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight truncate">
            {formatCurrency(monthlyBudget)}
          </div>
          <span className="text-[10px] sm:text-xs text-emerald-400 font-bold block group-hover:underline">
            Ajustar meta geral →
          </span>
        </div>

        {/* Card 4: Média Diária & Registros */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 p-4 sm:p-5 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Média Diária</span>
            <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight truncate">
            {formatCurrency(stats.media)}
          </div>
          <p className="text-[10px] sm:text-xs text-zinc-400">
            Em {totalRecords} {totalRecords === 1 ? "lançamento" : "lançamentos"}
          </p>
        </div>
      </div>

      {/* Monthly Budget Gauge Progress Bar */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-zinc-300">
            Consumo do Orçamento Geral ({usedPercentage.toFixed(0)}%)
          </span>
          <span className="text-zinc-400">
            {formatCurrency(totalSpent)} de {formatCurrency(monthlyBudget)}
          </span>
        </div>

        <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden p-0.5 border border-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${status.barColor}`}
            style={{ width: `${usedPercentage}%` }}
          />
        </div>
      </div>
    </section>
  );
}
