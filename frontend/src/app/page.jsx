"use client";

import { useState, useEffect, useCallback } from "react";
import { useExpenses } from "../hooks/useExpenses";
import { useWhatsAppSocket } from "../hooks/useWhatsAppSocket";
import { MONTH_NAMES } from "../lib/constants";
import { getApiBaseUrl, authFetch, clearSessionToken } from "../lib/config";

import { Header } from "../components/Header";
import { QuickActionBar } from "../components/QuickActionBar";
import { OverviewBanner } from "../components/OverviewBanner";
import { AnalyticsSection } from "../components/AnalyticsSection";
import { CategoryHealth } from "../components/CategoryHealth";
import { TransactionLedger } from "../components/TransactionLedger";
import { LoginScreen } from "../components/auth/LoginScreen";

import { AddTransactionModal } from "../components/modals/AddTransactionModal";
import { EditTransactionModal } from "../components/modals/EditTransactionModal";
import { LimitModal } from "../components/modals/LimitModal";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { WhatsAppModal } from "../components/modals/WhatsAppModal";
import { HowItWorksModal } from "../components/modals/HowItWorksModal";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

export default function Home() {
  const API_BASE = getApiBaseUrl();
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [mutationError, setMutationError] = useState("");

  const [dateFilter, setDateFilter] = useState({
    mes: new Date().getMonth(),
    ano: new Date().getFullYear()
  });

  useEffect(() => {
    let isMounted = true;

    authFetch(`${API_BASE}/api/auth/me`)
      .then(async (res) => {
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsAuthChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [API_BASE]);

  const handleSessionExpired = useCallback(() => {
    clearSessionToken();
    setUser(null);
  }, []);

  const {
    filteredExpenses,
    limits,
    stats,
    isLoading,
    error: expensesError,
    refetch,
    addExpense,
    addExpenseFromSocket,
    updateExpense,
    deleteExpense,
    clearExpenses,
    setLimit,
    removeLimit,
  } = useExpenses(dateFilter, Boolean(user), handleSessionExpired);

  useWhatsAppSocket(user ? addExpenseFromSocket : null);

  const handleLogout = async () => {
    try {
      await authFetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
    } catch {}
    clearSessionToken();
    setUser(null);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isHowItWorksModalOpen, setIsHowItWorksModalOpen] = useState(false);
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
    return addExpense(newExpense);
  };

  const handleSaveEdit = async (updatedExpense) => {
    setMutationError("");
    try {
      await updateExpense(updatedExpense);
      setEditingExpense(null);
    } catch (error) {
      setMutationError(error.message || "Não foi possível atualizar o gasto. Tente novamente.");
    }
  };

  const handleConfirmAction = async () => {
    setMutationError("");
    try {
      if (confirmModalState.type === "delete" && confirmModalState.expenseId) {
        await deleteExpense(confirmModalState.expenseId);
      } else if (confirmModalState.type === "clear") {
        await clearExpenses();
      }
      setConfirmModalState({ isOpen: false, type: "delete", expenseId: undefined });
    } catch (error) {
      setMutationError(error.message || "Não foi possível concluir a ação. Tente novamente.");
    }
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
        onLogout={handleLogout}
        onOpenHowItWorks={() => setIsHowItWorksModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {expensesError && (
          <div
            className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{expensesError}</p>
            </div>
            <button
              type="button"
              onClick={refetch}
              disabled={isLoading}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Tentar novamente
            </button>
          </div>
        )}

        <QuickActionBar
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
          onOpenHowItWorks={() => setIsHowItWorksModalOpen(true)}
        />

        <OverviewBanner
          stats={stats}
          limits={limits}
          onOpenLimitModal={handleOpenLimitModal}
        />

        <AnalyticsSection stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <CategoryHealth
              stats={stats}
              limits={limits}
              onOpenLimitModal={handleOpenLimitModal}
            />
          </div>

          <div className="lg:col-span-7">
            <TransactionLedger
              transactions={filteredExpenses}
              monthName={MONTH_NAMES[dateFilter.mes]}
              isLoading={isLoading}
              onEdit={(expense) => setEditingExpense(expense)}
              onDelete={(expenseId) => {
                setMutationError("");
                setConfirmModalState({
                  isOpen: true,
                  type: "delete",
                  expenseId
                });
              }}
              onClearAll={() => {
                setMutationError("");
                setConfirmModalState({
                  isOpen: true,
                  type: "clear",
                  expenseId: undefined
                });
              }}
              onOpenAddModal={() => setIsAddModalOpen(true)}
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
        key={editingExpense?.id ?? "closed"}
        isOpen={Boolean(editingExpense)}
        gasto={editingExpense}
        error={mutationError}
        onClose={() => {
          setMutationError("");
          setEditingExpense(null);
        }}
        onSave={handleSaveEdit}
      />

      <LimitModal
        key={`${limitModalState.isOpen}-${limitModalState.categoria}`}
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
        error={mutationError}
        onClose={() => {
          setMutationError("");
          setConfirmModalState({ isOpen: false, type: "delete", expenseId: undefined });
        }}
        onConfirm={handleConfirmAction}
      />

      <HowItWorksModal
        isOpen={isHowItWorksModalOpen}
        onClose={() => setIsHowItWorksModalOpen(false)}
        onOpenWhatsApp={() => setIsWhatsAppModalOpen(true)}
      />

      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />
    </div>
  );
}
