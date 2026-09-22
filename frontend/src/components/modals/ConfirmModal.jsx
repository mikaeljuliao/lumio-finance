import { Trash2 } from "lucide-react";

export function ConfirmModal({
  isOpen,
  type,
  onClose,
  onConfirm
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#18181B] border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-10 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-8 mx-auto">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-2xl font-black text-white uppercase italic mb-4">
          {type === "clear" ? "Limpar Tudo?" : "Excluir?"}
        </h3>
        <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
          Esta ação é permanente e não poderá ser desfeita.
        </p>
        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="w-full py-4 bg-red-500 text-black font-black rounded-xl uppercase tracking-widest"
          >
            Sim, Deletar
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 bg-zinc-800 text-zinc-400 font-bold rounded-xl uppercase tracking-widest text-xs"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
