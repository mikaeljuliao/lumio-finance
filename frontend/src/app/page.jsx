"use client";

import { useState, useCallback } from "react";
import { useGastos } from "../hooks/useGastos";
import { useWhatsAppSocket } from "../hooks/useWhatsAppSocket";

import { Header } from "../components/Header";
import { QrCodeSection } from "../components/QrCodeSection";
import { StatsGrid } from "../components/StatsGrid";
import { ChartsSection } from "../components/ChartsSection";
import { CategoryLimits } from "../components/CategoryLimits";
import { TransactionList } from "../components/TransactionList";

import { EditTransactionModal } from "../components/modals/EditTransactionModal";
import { LimitModal } from "../components/modals/LimitModal";
import { ConfirmModal } from "../components/modals/ConfirmModal";

export default function Home() {
  const [filtroData, setFiltroData] = useState({
    mes: new Date().getMonth(),
    ano: new Date().getFullYear()
  });

  const {
    gastosFiltrados,
    limites,
    stats,
    addGasto,
    updateGasto,
    deleteGasto,
    clearGastos,
    setLimite,
    removeLimite
  } = useGastos(filtroData);

  const handleNewGasto = useCallback(
    (novoGasto) => {
      addGasto(novoGasto);
    },
    [addGasto]
  );

  const { socketConnected, qrCode } = useWhatsAppSocket(handleNewGasto);

  // Estados de Controle dos Modais
  const [editingGasto, setEditingGasto] = useState(null);
  const [limitModalState, setLimitModalState] = useState({
    isOpen: false,
    categoria: "geral",
    valor: ""
  });
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    type: "delete",
    gastoId: undefined
  });

  // Navegação de Período
  const handlePrevMonth = () => {
    setFiltroData((prev) => ({
      mes: prev.mes === 0 ? 11 : prev.mes - 1,
      ano: prev.mes === 0 ? prev.ano - 1 : prev.ano
    }));
  };

  const handleNextMonth = () => {
    setFiltroData((prev) => ({
      mes: prev.mes === 11 ? 0 : prev.mes + 1,
      ano: prev.mes === 11 ? prev.ano + 1 : prev.ano
    }));
  };

  // Handlers para Ações dos Modais
  const handleOpenLimitModal = (categoria, valorAtual) => {
    setLimitModalState({
      isOpen: true,
      categoria,
      valor: valorAtual > 0 ? String(valorAtual) : ""
    });
  };

  const handleSaveLimit = (categoria, valor) => {
    setLimite(categoria, valor);
    setLimitModalState({ isOpen: false, categoria: "geral", valor: "" });
  };

  const handleRemoveLimit = (categoria) => {
    removeLimite(categoria);
    setLimitModalState({ isOpen: false, categoria: "geral", valor: "" });
  };

  const handleSaveEdit = (gastoAtualizado) => {
    updateGasto(gastoAtualizado);
    setEditingGasto(null);
  };

  const handleConfirmAction = () => {
    if (confirmModalState.type === "delete" && confirmModalState.gastoId) {
      deleteGasto(confirmModalState.gastoId);
    } else if (confirmModalState.type === "clear") {
      clearGastos();
    }
    setConfirmModalState({ isOpen: false, type: "delete", gastoId: undefined });
  };

  return (
    <main className="min-h-screen bg-[#09090B] text-zinc-100 p-4 md:p-10 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-10">
        <Header
          filtroData={filtroData}
          socketConnected={socketConnected}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        {!socketConnected && qrCode && <QrCodeSection qrCode={qrCode} />}

        <StatsGrid
          stats={stats}
          limites={limites}
          totalRegistros={gastosFiltrados.length}
          onOpenMetaModal={() =>
            handleOpenLimitModal("geral", limites.geral || 0)
          }
        />

        <ChartsSection stats={stats} />

        <CategoryLimits
          stats={stats}
          limites={limites}
          onOpenLimitModal={handleOpenLimitModal}
        />

        <TransactionList
          gastos={gastosFiltrados}
          mesAtual={filtroData.mes}
          onEdit={(gasto) => setEditingGasto(gasto)}
          onDelete={(gastoId) =>
            setConfirmModalState({
              isOpen: true,
              type: "delete",
              gastoId
            })
          }
          onClearAll={() =>
            setConfirmModalState({
              isOpen: true,
              type: "clear",
              gastoId: undefined
            })
          }
        />
      </div>

      <EditTransactionModal
        isOpen={Boolean(editingGasto)}
        gasto={editingGasto}
        onClose={() => setEditingGasto(null)}
        onSave={handleSaveEdit}
      />

      <LimitModal
        isOpen={limitModalState.isOpen}
        categoria={limitModalState.categoria}
        valorInicial={limitModalState.valor}
        onClose={() =>
          setLimitModalState({ isOpen: false, categoria: "geral", valor: "" })
        }
        onSave={handleSaveLimit}
        onRemove={handleRemoveLimit}
      />

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        type={confirmModalState.type}
        onClose={() =>
          setConfirmModalState({ isOpen: false, type: "delete", gastoId: undefined })
        }
        onConfirm={handleConfirmAction}
      />
    </main>
  );
}
