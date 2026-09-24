"use client";

import { useState, useEffect, useCallback } from "react";
import { useExpenses } from "../hooks/useExpenses";
import { useWhatsAppSocket } from "../hooks/useWhatsAppSocket";
import { MONTH_NAMES } from "../lib/constants";
import { getApiBaseUrl, authFetch, clearSessionToken } from "../lib/config";

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

export default function Home() {
  const API_BASE = getApiBaseUrl();
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [dateFilter, setDateFilter] = useState({
    mes: new Date().getMonth(),
    ano: new Date().getFullYear()
  });

  const checkSession = useCallback(async () => {
    setIsAuthChecking(true);
    try {
      const res = await authFetch(`${API_BASE}/api/auth/me`);
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
    filteredExpenses,
    limits,
    stats,
    isLoading,
    error,
    addExpense,
    addExpenseFromSocket,
    updateExpense,
    deleteExpense,
    clearExpenses,
    setLimit,
    removeLimit,
  } = useExpenses(dateFilter, Boolean(user));

  useWhatsAppSocket(user ? addExpenseFromSocket : null);

  useEffect(() => {
    if (error === "SESSION_EXPIRED") {
      setUser(null);
    }
  }, [error]);

  const handleLogout = async () => {
    try {
      await authFetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
    } catch (e) {}
    clearSessionToken();
    setUser(null);
  };

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [limitModalState, setLimitModalState] = useState({
    isOpen: false,
    categoria: "geral",
    valor: ""
  });
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    type: "delete",
    expenseId: undefined
  });

  const handlePrevMonth = () => {
    setDateFilter((prev) => ({
      mes: prev.mes === 0 ? 11 : prev.mes - 1,
      ano: prev.mes === 0 ? prev.ano - 1 : prev.ano
    }));
  };

  const handleNextMonth = () => {
    setDateFilter((prev) => ({
      mes: prev.mes === 11 ? 0 : prev.mes + 1,
      ano: prev.mes === 11 ? prev.ano + 1 : prev.ano
    }));
  };

  const handleOpenLimitModal = (categoria, currentValue) => {
    setLimitModalState({
      isOpen: true,
      categoria,
      valor: currentValue > 0 ? String(currentValue) : ""
    });
  };

  const handleSaveLimit = (categoria, valor) => {
    setLimit(categoria, valor);
    setLimitModalState({ isOpen: false, categoria: "geral", valor: "" });
  };

  const handleRemoveLimit = (categoria) => {
    removeLimit(categoria);
    setLimitModalState({ isOpen: false, categoria: "geral", valor: "" });
  };

  const handleSaveAdd = (newExpense) => {
    addExpense(newExpense);
  };

  const handleSaveEdit = (updatedExpense) => {
    updateExpense(updatedExpense);
    setEditingExpense(null);
  };

  const handleConfirmAction = () => {
    if (confirmModalState.type === "delete" && confirmModalState.expenseId) {
      deleteExpense(confirmModalState.expenseId);
    } else if (confirmModalState.type === "clear") {
      clearExpenses();
    }
    setConfirmModalState({ isOpen: false, type: "delete", expenseId: undefined });
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
      <Header
        filterDate={dateFilter}
        user={user}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <OverviewBanner
          stats={stats}
          limits={limits}
          totalRecords={filteredExpenses.length}
          onOpenLimitModal={handleOpenLimitModal}
        />

        <AnalyticsSection stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <TransactionLedger
              transactions={filteredExpenses}
              monthName={MONTH_NAMES[dateFilter.mes]}
              isLoading={isLoading}
              onEdit={(expense) => setEditingExpense(expense)}
              onDelete={(expenseId) =>
                setConfirmModalState({
                  isOpen: true,
                  type: "delete",
                  expenseId
                })
              }
              onClearAll={() =>
                setConfirmModalState({
                  isOpen: true,
                  type: "clear",
                  expenseId: undefined
                })
              }
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          </div>

          <div className="lg:col-span-5">
            <CategoryHealth
              stats={stats}
              limits={limits}
              onOpenLimitModal={handleOpenLimitModal}
            />
          </div>
        </div>
      </main>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveAdd}
      />

      <EditTransactionModal
        isOpen={Boolean(editingExpense)}
        gasto={editingExpense}
        onClose={() => setEditingExpense(null)}
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
          setConfirmModalState({ isOpen: false, type: "delete", expenseId: undefined })
        }
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
