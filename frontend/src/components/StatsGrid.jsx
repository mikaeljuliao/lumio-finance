import { ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";
import { formatCurrency } from "../lib/utils";

export function StatsGrid({
  stats,
  limites,
  totalRegistros,
  onOpenMetaModal
}) {
  const limiteGeral = limites.geral || 1;
  const percentualLimite = Math.min((stats.total / limiteGeral) * 100, 100);

  const getMetaColorClass = () => {
    if (percentualLimite >= 100) return "bg-red-600";
    if (percentualLimite >= 80) return "bg-amber-600";
    return "bg-emerald-600";
  };

  const getMetaStatusText = () => {
    if (percentualLimite >= 100) return "Estourou";
    if (percentualLimite >= 80) return "Cuidado";
    return "No Alvo";
  };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          Fluxo do Mês
        </p>
        <h3 className="text-3xl font-black text-white">
          {formatCurrency(stats.total)}
        </h3>
        <p
          className={`text-[10px] mt-2 flex items-center gap-1 font-bold ${
            stats.diff > 0 ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {stats.diff > 0 ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {Math.abs(stats.diff).toFixed(1)}% vs mês anterior
        </p>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          Média Diária
        </p>
        <h3 className="text-3xl font-black text-white">
          {formatCurrency(stats.media)}
        </h3>
        <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest">
          Média por item
        </p>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          Registros
        </p>
        <h3 className="text-3xl font-black text-white">{totalRegistros}</h3>
        <p className="text-[10px] text-emerald-500 mt-2 font-bold uppercase tracking-widest">
          Lançamentos no mês
        </p>
      </div>

      <div
        onClick={onOpenMetaModal}
        className={`cursor-pointer p-6 rounded-3xl shadow-xl transition-all hover:scale-105 active:scale-95 ${getMetaColorClass()}`}
      >
        <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex justify-between items-center">
          Meta Mensal
          <Plus className="w-3 h-3" />
        </p>
        <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
          {getMetaStatusText()}
        </h3>
        <div className="w-full bg-black/20 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-500"
            style={{ width: `${percentualLimite}%` }}
          />
        </div>
        <p className="text-[10px] text-white/90 mt-2 font-black uppercase tracking-widest flex justify-between">
          <span>{percentualLimite.toFixed(0)}% USADO</span>
          <span>{formatCurrency(limites.geral || 0)}</span>
        </p>
      </div>
    </section>
  );
}
