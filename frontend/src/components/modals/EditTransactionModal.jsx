import { useState, useEffect } from "react";
import { CATEGORIES } from "../../lib/constants";

export function EditTransactionModal({
  isOpen,
  gasto,
  onClose,
  onSave
}) {
  const [formData, setFormData] = useState(gasto);

  useEffect(() => {
    setFormData(gasto);
  }, [gasto]);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl">
        <h2 className="text-3xl font-black text-white italic uppercase mb-8">
          Ajustar Registro
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={formData.descricao}
            onChange={(e) =>
              setFormData({ ...formData, descricao: e.target.value })
            }
            className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 font-bold"
            placeholder="Descrição"
            required
          />
          <input
            type="number"
            step="0.01"
            value={formData.valor}
            onChange={(e) =>
              setFormData({
                ...formData,
                valor: parseFloat(e.target.value) || 0
              })
            }
            className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 font-black text-2xl"
            required
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFormData({ ...formData, categoria: cat.id })}
                className={`p-3 rounded-xl text-[10px] font-black uppercase border transition-all ${
                  formData.categoria === cat.id
                    ? "bg-emerald-500 border-emerald-500 text-black"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-lg"
          >
            Confirmar
          </button>
        </form>
      </div>
    </div>
  );
}
