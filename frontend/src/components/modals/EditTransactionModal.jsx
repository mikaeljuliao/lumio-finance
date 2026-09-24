import { useState, useEffect } from "react";
import { X, Edit3, Calendar, DollarSign, Tag, FileText } from "lucide-react";
import { CATEGORIES } from "../../lib/constants";

export function EditTransactionModal({ isOpen, gasto, onClose, onSave }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Editar Lançamento
              </h3>
              <p className="text-xs text-zinc-400">
                Ajuste os dados do gasto selecionado
              </p>
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
          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-emerald-400" /> Descrição
            </label>
            <input
              type="text"
              value={formData.descricao || ""}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/80 font-medium"
              required
            />
          </div>

          {/* Valor e Data Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.valor || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    valor: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/80 font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Data
              </label>
              <input
                type="date"
                value={formData.data ? String(formData.data).split("T")[0] : ""}
                onChange={(e) =>
                  setFormData({ ...formData, data: e.target.value })
                }
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/80 font-medium cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, categoria: cat.id })}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                    formData.categoria === cat.id
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="capitalize truncate">{cat.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/15"
            >
              Atualizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
