import { MessageSquare, Mic, Plus, Target } from "lucide-react";

export function ProductGuide({
  onOpenExpense,
  onOpenBudget,
  onOpenWhatsApp
}) {
  return (
    <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        <div className="lg:w-64 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            Comece por aqui
          </p>
          <h2 className="mt-1 text-base font-black text-white">
            Controle seus gastos do jeito que preferir.
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Pelo painel ou falando com o Lumio no WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
          <button
            onClick={onOpenExpense}
            className="text-left rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-emerald-500/30 p-3 transition-colors"
          >
            <div className="flex items-center gap-2 text-zinc-200">
              <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold">Registrar gasto</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Ex.: "Gastei R$ 45 no almoço"
            </p>
          </button>

          <button
            onClick={onOpenBudget}
            className="text-left rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-emerald-500/30 p-3 transition-colors"
          >
            <div className="flex items-center gap-2 text-zinc-200">
              <Target className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold">Definir orçamento</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Quanto pretende gastar neste mês?
            </p>
          </button>

          <button
            onClick={onOpenWhatsApp}
            className="text-left rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 p-3 transition-colors"
          >
            <div className="flex items-center gap-2 text-zinc-200">
              <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold">Usar pelo WhatsApp</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              "Gastei R$ 80 de gasolina" · texto ou áudio
            </p>
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800/70 flex items-center gap-2 text-[11px] text-zinc-500">
        <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Você pode escrever ou falar normalmente. Não precisa usar comandos.</span>
      </div>
    </section>
  );
}
