import { Wallet, ChevronLeft, ChevronRight, LogOut, Smartphone } from "lucide-react";
import { MONTH_NAMES } from "../lib/constants";

export function Header({
  filterDate,
  user,
  onPrevMonth,
  onNextMonth,
  onLogout
}) {
  const formatUserPhone = (id) => {
    if (!id) return "";
    const clean = String(id).replace(/\D/g, "");
    if (clean.length === 13 && clean.startsWith("55")) {
      const ddd = clean.slice(2, 4);
      const part1 = clean.slice(4, 9);
      const part2 = clean.slice(9);
      return `+55 (${ddd}) ${part1}-${part2}`;
    }
    return clean;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-4 md:px-8 mb-8 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-emerald-600 to-emerald-400 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-zinc-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
                  Lumio
                </h1>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Finance
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Gestão Inteligente de Gastos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-zinc-900/90 border border-zinc-800/90 p-1 rounded-2xl shadow-inner">
          <button
            onClick={onPrevMonth}
            className="p-2 hover:bg-zinc-800/80 rounded-xl transition-colors text-zinc-400 hover:text-white"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-1 text-center min-w-[130px]">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 block">
              {MONTH_NAMES[filterDate.mes]}
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold block leading-none">
              {filterDate.ano}
            </span>
          </div>
          <button
            onClick={onNextMonth}
            className="p-2 hover:bg-zinc-800/80 rounded-xl transition-colors text-zinc-400 hover:text-white"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
          {user && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-300 text-xs font-bold" title="Sua conta conectada">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatUserPhone(user.whatsappId)}</span>
            </div>
          )}

          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border-zinc-800 hover:border-red-500/20 transition-all text-xs font-bold cursor-pointer"
            title="Encerrar sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
