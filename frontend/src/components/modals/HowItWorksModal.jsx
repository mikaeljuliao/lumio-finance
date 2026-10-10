import { useEffect } from "react";
import { MessageSquare, Mic, Target, X, ArrowRight } from "lucide-react";

export function HowItWorksModal({ isOpen, onClose, onOpenWhatsApp }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const examples = [
    {
      icon: MessageSquare,
      title: "Registrar gasto",
      text: "gastei 35 no almoço"
    },
    {
      icon: Target,
      title: "Definir limite",
      text: "limite de 300 em lazer"
    },
    {
      icon: Mic,
      title: "Usar no WhatsApp",
      text: "gastei 80 na gasolina"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-it-works-title"
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-zinc-800 bg-[#0F0F12] p-5 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
            Como funciona o Lumio
          </p>
          <h3 id="how-it-works-title" className="mt-2 text-2xl font-black text-white tracking-tight">
            Você controla por web ou WhatsApp.
          </h3>
        </div>

        <div className="mt-5 space-y-3">
          {examples.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white">{title}</div>
                  <div className="mt-1 font-mono text-xs text-zinc-300">“{text}”</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300">
          Basta escrever como você fala no dia a dia. O Lumio entende texto, voz e limite do mês.
        </div>

        <button
          onClick={() => {
            onClose();
            onOpenWhatsApp();
          }}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-950 transition-colors hover:bg-emerald-400"
        >
          Ver no WhatsApp
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
