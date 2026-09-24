import { Plus, MessageSquare, Zap } from "lucide-react";

export function QuickActionBar({ onOpenAddModal, onOpenWhatsAppModal }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-r from-zinc-900/90 via-zinc-900 to-zinc-950 border border-zinc-800/80 p-3 sm:p-4 rounded-2xl shadow-lg backdrop-blur-sm">
      <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-300 font-bold uppercase tracking-wider pl-1">
        <Zap className="w-3.5 h-3.5 text-emerald-400" />
        <span>Registrar Gasto:</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full sm:w-auto">
        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/15 active:scale-95 cursor-pointer uppercase tracking-wider text-center"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="truncate">+ Novo Gasto</span>
        </button>

        <button
          onClick={onOpenWhatsAppModal}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
          title="Falar com o robô do Lumio no WhatsApp"
        >
          <MessageSquare className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="truncate">Falar no WhatsApp</span>
        </button>
      </div>
    </div>
  );
}
