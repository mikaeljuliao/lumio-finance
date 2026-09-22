import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

export function LimitModal({
  isOpen,
  categoria,
  valorInicial,
  onClose,
  onSave,
  onRemove
}) {
  const [valor, setValor] = useState(valorInicial);

  useEffect(() => {
    setValor(valorInicial);
  }, [valorInicial]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const valorNumerico = parseFloat(valor) || 0;
    onSave(categoria, valorNumerico);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-white italic uppercase">
            Definir Limite
          </h2>
          <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">
            {categoria}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1">
              Valor Máximo Mensal
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={valor}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setValor(val);
              }}
              placeholder="Ex: 500"
              className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 font-black text-3xl placeholder:text-zinc-800"
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onRemove(categoria)}
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-red-500 transition-all"
              aria-label="Remover limite"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl transition-all uppercase tracking-widest text-sm"
            >
              Salvar Limite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
