import { Trash2, AlertTriangle, X } from "lucide-react";

export function ConfirmModal({
  isOpen,
  type,
  onClose,
  onConfirm
}) {
  if (!isOpen) return null;

  const isClearAll = type === "clear";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-sm rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-12 h-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
          {isClearAll ? <AlertTriangle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">
            {isClearAll ? "Limpar Histórico do Mês?" : "Excluir Lançamento?"}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {isClearAll
              ? "Esta ação removerá todos os lançamentos exibidos para o mês selecionado."
              : "Esta ação é permanente e removerá o gasto selecionado."}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 bg-red-500 hover:bg-red-400 text-zinc-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Confirmar Exclusão
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold rounded-xl text-xs transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
