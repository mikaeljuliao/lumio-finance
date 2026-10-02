import { useState, useEffect } from "react";
import { X, Sliders, Trash2 } from "lucide-react";
import { parseCurrencyInput } from "../../lib/utils";

export function LimitModal({
  isOpen,
  categoria,
  valorInicial,
  onClose,
  onSave,
  onRemove
}) {
  const [amount, setAmount] = useState(valorInicial);
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmount(valorInicial);
      setAmountError("");
    }
  }, [isOpen, valorInicial]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numericValue = parseCurrencyInput(amount);
    if (numericValue === null || numericValue <= 0) {
      setAmountError("Informe um valor maior que zero, como 500,00.");
      return;
    }
    setAmountError("");
    onSave(categoria, numericValue);
  };

  const isGeneral = categoria === "geral";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-sm rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                {isGeneral ? "Definir Orçamento Mensal" : "Definir Limite"}
              </h3>
              <span className="text-xs font-bold text-emerald-400 capitalize">
                {isGeneral ? "Orçamento Mensal" : categoria}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">
              Quanto você pretende gastar neste mês? (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountError("");
              }}
              placeholder="Ex: 1.500,00"
              aria-invalid={Boolean(amountError)}
              aria-describedby={amountError ? "limit-amount-error" : undefined}
              className={`w-full bg-zinc-950/80 border rounded-xl px-4 py-3 text-2xl text-white font-black placeholder:text-zinc-700 outline-none focus:border-emerald-500/80 ${amountError ? "border-red-500/70" : "border-zinc-800"}`}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            {amountError && (
              <p id="limit-amount-error" className="text-xs text-red-400" role="alert">
                {amountError}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            {!isGeneral && (
              <button
                type="button"
                onClick={() => onRemove(categoria)}
                className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors"
                title="Remover limite da categoria"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider"
            >
              {isGeneral ? "Salvar Orçamento" : "Salvar Limite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
