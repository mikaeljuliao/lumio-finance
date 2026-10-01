import { BarChart3, MessageSquareText, Target } from "lucide-react";

export function ProductGuide() {
  return (
    <section
      aria-label="Como usar o Lumio"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="lg:max-w-xs">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
            Como usar
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            Controle seu dinheiro em poucos passos.
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Você registra, define seus limites e acompanha tudo pelo painel.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-3xl">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-200">
                1. Registre
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Envie pelo WhatsApp: “Gastei R$ 45 no almoço”.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-200">
                2. Defina limites
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Escolha quanto pretende gastar no mês ou em cada categoria.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-200">
                3. Acompanhe
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Veja quanto gastou, onde gastou e como está seu orçamento.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-zinc-800/70 pt-3 text-center text-[11px] text-zinc-500">
        Não precisa decorar comandos. Escreva ou fale normalmente pelo WhatsApp.
      </p>
    </section>
  );
}
