import { useEffect, useState } from "react";
import { Check, MessageSquare, Plus, Target, Wallet } from "lucide-react";

const ONBOARDING_KEY = "lumio-onboarding";

export function OnboardingCard({
  user,
  hasBudget,
  hasExpense,
  onOpenBudget,
  onOpenExpense,
  onOpenWhatsApp
}) {
  const [completed, setCompleted] = useState({
    budget: false,
    expense: false,
    whatsapp: false
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const userKey = user?.id || user?.whatsappId;
    if (!userKey) return;

    const stored = localStorage.getItem(`${ONBOARDING_KEY}:${userKey}`);
    const saved = stored ? JSON.parse(stored) : {};

    setCompleted({
      budget: Boolean(saved.budget || hasBudget),
      expense: Boolean(saved.expense || hasExpense),
      whatsapp: Boolean(saved.whatsapp)
    });
    setIsInitialized(true);
  }, [user, hasBudget, hasExpense]);

  useEffect(() => {
    const userKey = user?.id || user?.whatsappId;
    if (!userKey || !isInitialized) return;

    localStorage.setItem(
      `${ONBOARDING_KEY}:${userKey}`,
      JSON.stringify(completed)
    );
  }, [completed, user, isInitialized]);

  if (completed.budget && completed.expense && completed.whatsapp) {
    return null;
  }

  const complete = (step) => {
    setCompleted((prev) => ({ ...prev, [step]: true }));
  };

  const steps = [
    {
      id: "budget",
      icon: Target,
      title: "Defina seu orçamento mensal",
      description: "Quanto você pretende gastar neste mês?",
      action: "Definir orçamento",
      onClick: () => onOpenBudget()
    },
    {
      id: "expense",
      icon: Plus,
      title: "Registre seu primeiro gasto",
      description: 'Ex.: "Gastei R$ 35 no almoço"',
      action: "Adicionar gasto",
      onClick: () => onOpenExpense()
    },
    {
      id: "whatsapp",
      icon: MessageSquare,
      title: "Use o Lumio pelo WhatsApp",
      description: "Registre gastos por texto ou áudio, sem abrir o painel.",
      action: "Ver como usar",
      onClick: () => onOpenWhatsApp()
    }
  ];

  const handleStepClick = (step) => {
    if (completed[step.id]) return;

    step.onClick();
    if (step.id === "whatsapp") {
      complete(step.id);
    }
  };

  return (
    <section className="bg-gradient-to-r from-zinc-900/95 via-zinc-900 to-zinc-950 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
            Primeiros passos
          </p>
          <h2 className="text-lg sm:text-xl font-black text-white mt-1">
            Comece a usar o Lumio em 3 passos
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Defina seu orçamento, registre gastos e acompanhe quanto ainda pode gastar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isDone = completed[step.id];

            return (
              <div
                key={step.id}
                className={`rounded-xl border p-3 transition-colors ${
                  isDone
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-zinc-800 bg-zinc-950/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isDone
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Passo {index + 1}
                    </p>
                    <h3 className="text-xs font-bold text-white mt-0.5">
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      {step.description}
                    </p>

                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => handleStepClick(step)}
                        className="mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        {step.action} →
                      </button>
                    )}

                    {isDone && (
                      <span className="inline-block mt-2 text-[11px] font-bold text-emerald-400">
                        Concluído
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Você não precisa decorar comandos. Escreva no WhatsApp como falaria normalmente.
          </span>
        </div>
      </div>
    </section>
  );
}
