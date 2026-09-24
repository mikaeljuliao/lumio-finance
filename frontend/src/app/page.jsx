"use client";

import { useState, useCallback } from "react";
import { useGastos } from "../hooks/useGastos";
import { useWhatsAppSocket } from "../hooks/useWhatsAppSocket";
import { MONTH_NAMES } from "../lib/constants";

import { Header } from "../components/Header";
import { QrCodeBanner } from "../components/QrCodeBanner";
import { OverviewBanner } from "../components/OverviewBanner";
import { AnalyticsSection } from "../components/AnalyticsSection";
import { CategoryHealth } from "../components/CategoryHealth";
import { TransactionLedger } from "../components/TransactionLedger";

import { AddTransactionModal } from "../components/modals/AddTransactionModal";
import { EditTransactionModal } from "../components/modals/EditTransactionModal";
import { LimitModal } from "../components/modals/LimitModal";
import { ConfirmModal } from "../components/modals/ConfirmModal";

export default function Home() {
  const [filterDate, setFilterDate] = useState({
    mes: new Date().getMonth(),
    ano: new Date().getFullYear()
  });

  const {
    gastosFiltrados,
    limites,
    stats,
    isLoading,
    addGasto,
    updateGasto,
    deleteGasto,
    clearGastos,
    setLimite,
    removeLimite
  } = useGastos(filterDate);

  const handleNewGasto = useCallback(
    (novoGasto) => {
      addGasto(novoGasto);
    },
    [addGasto]
  );

  const { socketConnected, qrCode, connectWhatsApp, disconnectWhatsApp } =
    useWhatsAppSocket(handleNewGasto);

  // Modal Controls
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  // Date Navigation
  const handlePrevMonth = () => {
    setFilterDate((prev) => ({
      mes: prev.mes === 0 ? 11 : prev.mes - 1,
      ano: prev.mes === 0 ? prev.ano - 1 : prev.ano
    }));
  };

  const handleNextMonth = () => {
    setFilterDate((prev) => ({
      mes: prev.mes === 11 ? 0 : prev.mes + 1,
      ano: prev.mes === 11 ? prev.ano + 1 : prev.ano
    }));
  };

  // Limit Handlers
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

  // Edit / Add Handlers
  const handleSaveAdd = (novoGasto) => {
    addGasto(novoGasto);
  };

  const handleSaveEdit = (gastoAtualizado) => {
    updateGasto(gastoAtualizado);
    setEditingGasto(null);
  };

  // Confirm Action Handler
  const handleConfirmAction = () => {
    if (confirmModalState.type === "delete" && confirmModalState.gastoId) {
      deleteGasto(confirmModalState.gastoId);
    } else if (confirmModalState.type === "clear") {
      clearGastos();
    }
    setConfirmModalState({ isOpen: false, type: "delete", gastoId: undefined });
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans selection:bg-emerald-500/30 pb-20 antialiased overflow-x-hidden">
      {/* Navbar Header */}
      <Header
        filterDate={filterDate}
        socketConnected={socketConnected}
        qrCode={qrCode}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onConnectWhatsApp={connectWhatsApp}
        onDisconnectWhatsApp={disconnectWhatsApp}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* QR Code Scan Section */}
        {!socketConnected && qrCode && <QrCodeBanner qrCode={qrCode} />}

        {/* 1. Resumo Financeiro (Hero KPIs) */}
        <OverviewBanner
          stats={stats}
          limits={limites}
          totalRecords={gastosFiltrados.length}
          onOpenLimitModal={handleOpenLimitModal}
        />

        {/* 2. Análises e Gráficos */}
        <AnalyticsSection stats={stats} />

        {/* 3. Seção Lado a Lado Responsiva (Extrato + Limites por Categoria) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Operational Ledger (Col 7 Desktop, Full Width Mobile) */}
          <div className="lg:col-span-7">
            <TransactionLedger
              transactions={gastosFiltrados}
              monthName={MONTH_NAMES[filterDate.mes]}
              isLoading={isLoading}
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
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          </div>

          {/* Category Budget Health (Col 5 Desktop, Full Width Mobile) */}
          <div className="lg:col-span-5">
            <CategoryHealth
              stats={stats}
              limits={limites}
              onOpenLimitModal={handleOpenLimitModal}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveAdd}
      />

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
    </div>
  );
}
