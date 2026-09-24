"use client";

import { useState, useEffect, useCallback } from "react";
import { useGastos } from "../hooks/useGastos";
import { useWhatsAppSocket } from "../hooks/useWhatsAppSocket";
import { MONTH_NAMES } from "../lib/constants";

import { Header } from "../components/Header";
import { OverviewBanner } from "../components/OverviewBanner";
import { AnalyticsSection } from "../components/AnalyticsSection";
import { CategoryHealth } from "../components/CategoryHealth";
import { TransactionLedger } from "../components/TransactionLedger";
import { LoginScreen } from "../components/auth/LoginScreen";

import { AddTransactionModal } from "../components/modals/AddTransactionModal";
import { EditTransactionModal } from "../components/modals/EditTransactionModal";
import { LimitModal } from "../components/modals/LimitModal";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { Loader2 } from "lucide-react";
import { getApiBaseUrl } from "../lib/config";

export default function Home() {
  const API_BASE = getApiBaseUrl();
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [filterDate, setFilterDate] = useState({
    mes: new Date().getMonth(),
    ano: new Date().getFullYear()
  });

  // Checar sessão do usuário no carregamento
  const checkSession = useCallback(async () => {
    setIsAuthChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const {
    gastos,
    gastosFiltrados,
    limites,
    stats,
    isLoading,
    error,
    addGasto,
    addGastoFromSocket,
    updateGasto,
    deleteGasto,
    clearGastos,
    setLimite,
    removeLimite
  } = useGastos(filterDate, Boolean(user));

  // Real-time: adiciona gasto recebido via Socket.IO ao estado local
  const handleNewGasto = useCallback((gasto) => {
    addGastoFromSocket(gasto);
  }, [addGastoFromSocket]);

  // Socket.IO: conecta e escuta eventos apenas quando o usuário estiver autenticado
  useWhatsAppSocket(user ? handleNewGasto : null);

  // Tratar expiração de sessão
  useEffect(() => {
    if (error === "SESSION_EXPIRED") {
      setUser(null);
    }
  }, [error]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {}
    setUser(null);
  };

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

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Verificando sessão no Lumio...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans selection:bg-emerald-500/30 pb-20 antialiased overflow-x-hidden">
      {/* Navbar Header */}
      <Header
        filterDate={filterDate}
        user={user}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
