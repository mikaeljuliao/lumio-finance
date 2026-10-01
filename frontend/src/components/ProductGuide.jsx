import { MessageSquare, Mic, Target, Plus, CheckCircle2 } from "lucide-react";
import { LUMIO_WHATSAPP } from "../lib/constants";

export function ProductGuide({ onOpenBudget, onOpenExpense, onOpenWhatsApp }) {
  return (
    <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Como usar o Lumio
            </p>
            <h2 className="mt-1 text-base sm:text-lg font-black text-white">
              O Lumio entende o jeito normal que você fala e escreve.
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Você não precisa decorar comandos. Basta registrar o gasto, definir o limite ou mandar um áudio como se estivesse falando com um amigo.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 border border-emerald-500/25 bg-emerald-500/5 text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.18em]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Texto + voz + limites
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={onOpenExpense}
            className="text-left bg-zinc-950/70 border border-zinc-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors"
          >
            <div className="flex items-center gap-2 text-zinc-200">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Registrar um gasto</span>
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Ex.: &quot;gastei 45 no almoço&quot; · &quot;mercado 180&quot;
            </p>
          </button>

          <button
            onClick={onOpenBudget}
            className="text-left bg-zinc-950/70 border border-zinc-800/80 hover:border-emerald-500/30 rounded-xl p-3 transition-colors"
          >
            <div className="flex items-center gap-2 text-zinc-200">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Definir limite</span>
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Ex.: &quot;meu limite de lazer é 600&quot; · &quot;limite geral 2500&quot;
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
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Mande texto ou áudio. Ex.: &quot;gastei 80 na gasolina&quot;
            </p>
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-zinc-500">
        <div className="flex items-center gap-2">
          <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Você também pode mandar áudio: “gastei 60 no supermercado”</span>
        </div>
        <span className="hidden sm:inline">WhatsApp: {LUMIO_WHATSAPP.formatted}</span>
      </div>
    </section>
  );
}
