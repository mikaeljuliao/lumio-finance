import { useState, useMemo } from "react";
import { Search, Filter, Trash2, Edit3, ReceiptText, Plus, X } from "lucide-react";
import { CATEGORIES, CATEGORY_ICON_MAP } from "../lib/constants";
import { formatCurrency, groupTransactionsByDate } from "../lib/utils";

export function TransactionLedger({
  transactions,
  monthName,
  isLoading,
  onEdit,
  onDelete,
  onClearAll,
  onOpenAddModal
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const matchesSearch =
        (item.descricao || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.categoria || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || item.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, selectedCategory]);

  const groupedData = useMemo(() => {
    return groupTransactionsByDate(filteredTransactions);
  }, [filteredTransactions]);

  return (
    <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Histórico de Transações
              </h3>
              <span className="text-xs font-bold bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full">
                {filteredTransactions.length}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Lançamentos registrados em {monthName}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar gasto..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/80 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Selector */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-emerald-500/80 cursor-pointer appearance-none pr-8"
            >
              <option value="all">Todas Categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Clear All Button */}
          {transactions.length > 0 && (
            <button
              onClick={onClearAll}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all text-xs font-bold flex items-center gap-1.5"
              title="Limpar histórico do mês"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="space-y-4 py-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-zinc-800/40 rounded-2xl animate-pulse border border-zinc-800/50"
            />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-16 px-4 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 bg-zinc-800/80 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto">
            <ReceiptText className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-zinc-300">
            Nenhuma transação encontrada
          </p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "all"
              ? "Tente mudar os filtros de busca para encontrar o lançamento."
              : `Não há gastos registrados no mês de ${monthName}.`}
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold transition-all mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Gasto</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedData.map((group) => (
            <div key={group.date} className="space-y-2">
              {/* Date Header */}
              <div className="flex items-center justify-between px-2 py-1 text-xs font-bold border-b border-zinc-800/50 text-zinc-400">
                <span className="uppercase tracking-wider">{group.formattedDate}</span>
                <span className="text-zinc-400">Total: {formatCurrency(group.total)}</span>
              </div>

              {/* Transactions List */}
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between bg-zinc-950/60 hover:bg-zinc-800/50 border border-zinc-800/80 p-3.5 sm:p-4 rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg shrink-0">
                        {CATEGORY_ICON_MAP[item.categoria] || "💰"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate capitalize">
                          {item.descricao}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold bg-zinc-800/90 text-zinc-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {item.categoria}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-base sm:text-lg font-black text-white tracking-tight">
                        {formatCurrency(item.valor)}
                      </span>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 bg-zinc-800/90 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-400 rounded-lg border border-zinc-700/80 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-1.5 bg-zinc-800/90 hover:bg-red-500 hover:text-white text-zinc-400 rounded-lg border border-zinc-700/80 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
