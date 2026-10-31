import { useState, useEffect } from "react";
import { X, Plus, Edit3, Calendar, DollarSign, Tag, FileText } from "lucide-react";
import { CATEGORIES } from "../../lib/constants";
import { extractDateOnly, getLocalDateInputValue, parseCurrencyInput } from "../../lib/utils";

function TransactionModalForm({
  mode,
  expense,
  error,
  onClose,
  onSave
}) {
  const isEditMode = mode === "edit" || Boolean(expense);

  const [description, setDescription] = useState(() => expense?.descricao || "");
  const [amount, setAmount] = useState(() =>
    expense?.valor != null ? String(expense.valor).replace(".", ",") : ""
  );
  const [amountError, setAmountError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState(() => expense?.categoria || "alimentação");
  const [date, setDate] = useState(() => extractDateOnly(expense?.data) || getLocalDateInputValue());

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedAmount = parseCurrencyInput(amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      setAmountError("Informe um valor válido, como 45,90.");
      return;
    }
    setAmountError("");
    setSaveError("");
    setIsSaving(true);

    try {
      const payload = isEditMode
        ? {
            ...expense,
            descricao: description.trim(),
            valor: parsedAmount,
            categoria: category,
            data: date,
          }
        : {
            id: Date.now(),
            descricao: description.trim(),
            valor: parsedAmount,
            categoria: category,
            data: date,
            created_at: new Date().toISOString(),
          };

      await onSave(payload);
      onClose();
    } catch (err) {
      setSaveError(err.message || "Não foi possível salvar o gasto. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const displayedError = saveError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20 shrink-0">
              {isEditMode ? (
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                {isEditMode ? "Editar Lançamento" : "Novo Gasto"}
              </h3>
              <p className="text-xs text-zinc-400">
                {isEditMode
                  ? "Ajuste os dados do gasto selecionado"
                  : "Adicione um lançamento manual pelo site"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" /> Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Almoço, Uber, Supermercado..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/80 font-medium"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Valor (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountError("");
                }}
                placeholder="Ex: 45,90"
                aria-invalid={Boolean(amountError)}
                aria-describedby={amountError ? "transaction-amount-error" : undefined}
                className={`w-full bg-zinc-950/80 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/80 font-bold ${
                  amountError ? "border-red-500/70" : "border-zinc-800"
                }`}
                required
              />
              {amountError && (
                <p id="transaction-amount-error" className="text-xs text-red-400" role="alert">
                  {amountError}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-emerald-500/80 font-medium cursor-pointer"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 min-w-0 ${
                    category === cat.id
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="shrink-0">{cat.icon}</span>
                  <span className="capitalize truncate">{cat.id}</span>
                </button>
              ))}
            </div>
          </div>

          {displayedError && (
            <p className="text-xs text-red-400" role="alert">
              {displayedError}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2.5 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/15"
            >
              {isSaving
                ? "Salvando..."
                : isEditMode
                  ? "Atualizar"
                  : "Salvar Gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TransactionModal({
  isOpen,
  mode = "add",
  expense = null,
  error = "",
  onClose,
  onSave
}) {
  if (!isOpen) return null;

  return (
    <TransactionModalForm
      key={expense?.id ?? "new-transaction"}
      mode={mode}
      expense={expense}
      error={error}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
