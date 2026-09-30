import { MessageSquare, Mic, Target, Plus } from "lucide-react";
import { LUMIO_WHATSAPP } from "../lib/constants";

export function ProductGuide({ onOpenBudget, onOpenExpense, onOpenWhatsApp }) {
  return (
    <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        <div className="lg:min-w-[190px]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            Como usar o Lumio
          </p>
          <h2 className="mt-1 text-base font-black text-white">
            Controle seus gastos pelo painel ou pelo WhatsApp.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <button
            onClick={onOpenExpense}
            className="text-left bg-zinc-950/70 border border-zinc-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors"
          >
            <div className="flex items-center gap-2 text-zinc-200">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Registrar um gasto</span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">
              Ex.: &quot;Gastei R$ 45 no almoço&quot;
            </p>
          </button>

          <button
            onClick={onOpenWhatsApp}
            className="text-left bg-zinc-950/70 border border-zinc-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors"
          >
            <div className="flex items-center gap-2 text-zinc-200">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Usar pelo WhatsApp</span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">
              &quot;Gastei R$ 80 de gasolina&quot; · texto ou áudio
            </p>
          </button>
        </div>

        <button
          onClick={onOpenBudget}
          className="lg:max-w-[210px] text-left border border-zinc-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors"
        >
          <div className="flex items-center gap-2 text-zinc-200">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">Orçamento mensal</span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">
            Defina quanto pretende gastar neste mês.
          </p>
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800/70 flex items-center gap-2 text-[11px] text-zinc-500">
        <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Você não precisa usar comandos específicos. Fale ou escreva normalmente.</span>
        <span className="hidden sm:inline">WhatsApp: {LUMIO_WHATSAPP.formatted}</span>
      </div>
    </section>
  );
}
