import { Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { MONTH_NAMES } from "../lib/constants";

export function Header({
  filtroData,
  socketConnected,
  onPrevMonth,
  onNextMonth
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-xl shadow-emerald-500/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
            Lumio
            <span className="ml-3 text-[10px] not-italic bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full border border-zinc-700 font-black tracking-[0.2em]">
              PRO
            </span>
          </h1>
        </div>
        <p className="text-zinc-500 text-sm font-medium ml-1">
          Análise inteligente via WhatsApp
        </p>
      </div>

      <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
        <button
          onClick={onPrevMonth}
          className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
          aria-label="Mês anterior"
        >
          <ArrowDownRight className="w-4 h-4 rotate-90" />
        </button>
        <div className="px-4 text-center min-w-[140px]">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-500">
            {MONTH_NAMES[filtroData.mes]} {filtroData.ano}
          </span>
        </div>
        <button
          onClick={onNextMonth}
          className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
          aria-label="Próximo mês"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
            socketConnected
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
              : "bg-zinc-900/50 border-zinc-800 text-zinc-500"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              socketConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-700"
            }`}
          />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {socketConnected ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
