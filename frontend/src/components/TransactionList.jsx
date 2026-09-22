import { ListFilter, Trash2, Edit3 } from "lucide-react";
import { CATEGORY_ICON_MAP, MONTH_NAMES } from "../lib/constants";
import { formatCurrency, formatDate } from "../lib/utils";

export function TransactionList({
  gastos,
  mesAtual,
  onEdit,
  onDelete,
  onClearAll
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black text-white italic uppercase flex items-center gap-3">
          <ListFilter className="w-6 h-6 text-emerald-500" /> Histórico do Mês
        </h2>
        <button
          onClick={onClearAll}
          className="p-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-red-500/40 hover:text-red-500 transition-all"
          aria-label="Limpar histórico"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gastos.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2rem]">
            <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">
              Nenhum registro em {MONTH_NAMES[mesAtual]}
            </p>
          </div>
        ) : (
          gastos.map((g) => (
            <div
              key={g.id}
              className="group bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800 p-5 rounded-3xl transition-all flex items-center justify-between relative overflow-hidden"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {CATEGORY_ICON_MAP[g.categoria] || "💰"}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-zinc-100 capitalize">
                    {g.descricao}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-black bg-zinc-800 px-2 py-1 rounded text-zinc-400 uppercase tracking-widest">
                      {g.categoria}
                    </span>
                    <span className="text-[10px] font-black text-zinc-600">
                      {formatDate(g.data)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-2xl font-black text-white tracking-tighter">
                  {formatCurrency(Number(g.valor))}
                </span>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                  <button
                    onClick={() => onEdit(g)}
                    className="p-2 bg-zinc-800 hover:text-emerald-500 rounded-lg border border-zinc-700"
                    aria-label="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(g.id)}
                    className="p-2 bg-zinc-800 hover:text-red-500 rounded-lg border border-zinc-700"
                    aria-label="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
