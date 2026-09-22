import { ListFilter } from "lucide-react";
import { CATEGORIES } from "../lib/constants";
import { formatCurrency } from "../lib/utils";

export function CategoryLimits({
  stats,
  limites,
  onOpenLimitModal
}) {
  return (
    <section className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[2.5rem]">
      <h2 className="text-xl font-black text-white italic uppercase mb-10 flex items-center gap-3">
        <ListFilter className="w-5 h-5 text-emerald-500" /> Gestão de Limites por Categoria
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
        {CATEGORIES.map((cat) => {
          const gastoCat = stats.porCategoria[cat.id] || 0;
          const limiteCat = limites[cat.id] || 0;
          const perc =
            limiteCat > 0 ? Math.min((gastoCat / limiteCat) * 100, 100) : 0;

          const getPercColorClass = () => {
            if (perc >= 100) return "text-red-500";
            if (perc >= 80) return "text-amber-500";
            return "text-emerald-500";
          };

          const getProgressBarClass = () => {
            if (perc >= 100) return "bg-red-500";
            if (perc >= 80) return "bg-amber-500";
            return "bg-emerald-500";
          };

          return (
            <div
              key={cat.id}
              className="space-y-3 cursor-pointer group p-4 rounded-2xl hover:bg-zinc-800/40 transition-all border border-transparent hover:border-zinc-700/50"
              onClick={() => onOpenLimitModal(cat.id, limiteCat)}
            >
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-500 group-hover:text-zinc-300 uppercase tracking-widest block transition-colors">
                    {cat.label}
                  </span>
                  <span className="text-lg font-black text-white tracking-tighter">
                    {formatCurrency(gastoCat)}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest block ${getPercColorClass()}`}
                  >
                    {limiteCat > 0 ? `${perc.toFixed(0)}% do limite` : "Sem teto"}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-600 block">
                    Meta: {limiteCat > 0 ? formatCurrency(limiteCat) : "---"}
                  </span>
                </div>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getProgressBarClass()}`}
                  style={{ width: `${limiteCat > 0 ? perc : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
