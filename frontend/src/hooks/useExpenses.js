import { useState, useEffect, useCallback, useMemo, startTransition } from "react";
import { calculateStats } from "../lib/utils";
import { getApiBaseUrl, authFetch } from "../lib/config";

export function useExpenses(dateFilter, isAuthenticated = true, onSessionExpired) {
  const API_BASE = getApiBaseUrl();
  const [expenses, setExpenses] = useState([]);
  const [limits, setLimits] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpensesAndLimits = useCallback(async () => {
    if (!isAuthenticated) return null;

    const [resExpenses, resLimits] = await Promise.all([
      authFetch(`${API_BASE}/api/gastos`),
      authFetch(`${API_BASE}/api/limites`),
    ]);

    if (resExpenses.status === 401 || resLimits.status === 401) {
      return { sessionExpired: true };
    }

    const [dataExpenses, dataLimits] = await Promise.all([
      resExpenses.ok ? resExpenses.json() : null,
      resLimits.ok ? resLimits.json() : null,
    ]);

    return {
      expenses: Array.isArray(dataExpenses)
        ? dataExpenses.map((g) => ({
            id: g.id,
            valor: Number(g.valor),
            categoria: g.categoria || "outros",
            descricao: g.descricao || "Sem descrição",
            data: g.data ? String(g.data).split("T")[0] : new Date().toISOString().split("T")[0],
            created_at: g.criadoEm || g.created_at || new Date().toISOString(),
          }))
        : null,
      limits: dataLimits && typeof dataLimits === "object" && !Array.isArray(dataLimits)
        ? dataLimits
        : null,
    };
  }, [API_BASE, isAuthenticated]);

  const applyFetchedData = useCallback((result) => {
    if (!result) return;
    if (result.sessionExpired) {
      setError("SESSION_EXPIRED");
      onSessionExpired?.();
      return;
    }

    setError(null);
    if (result.expenses) setExpenses(result.expenses);
    if (result.limits) setLimits(result.limits);
  }, [onSessionExpired]);

  const handleFetchError = useCallback((err) => {
    console.error("Error fetching data from backend:", err);
    setError("Unable to load data.");
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    startTransition(() => setIsLoading(true));
    let isActive = true;
    fetchExpensesAndLimits()
      .then((result) => {
        if (isActive) applyFetchedData(result);
      })
      .catch((err) => {
        if (isActive) handleFetchError(err);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [applyFetchedData, fetchExpensesAndLimits, handleFetchError, isAuthenticated]);

  const refetch = useCallback(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    return fetchExpensesAndLimits()
      .then(applyFetchedData)
      .catch(handleFetchError)
      .finally(() => setIsLoading(false));
  }, [applyFetchedData, fetchExpensesAndLimits, handleFetchError, isAuthenticated]);

  const addExpense = useCallback(async (newExpense) => {
    const formatted = {
      valor: Number(newExpense.valor),
      categoria: newExpense.categoria || "outros",
      descricao: newExpense.descricao || "Sem descrição",
      data: newExpense.data ? String(newExpense.data).split("T")[0] : new Date().toISOString().split("T")[0],
    };

    try {
      const res = await authFetch(`${API_BASE}/api/gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatted),
      });
      if (res.ok) {
        const created = await res.json();
        setExpenses((prev) => {
          if (prev.some((g) => g.id === created.id)) return prev;
          return [created, ...prev];
        });
      }
    } catch (err) {
      console.error("Error saving expense to backend:", err);
    }
  }, [API_BASE]);

  const addExpenseFromSocket = useCallback((expense) => {
    const formatted = {
      id: expense.id,
      valor: Number(expense.valor),
      categoria: expense.categoria || "outros",
      descricao: expense.descricao || "Sem descrição",
      data: expense.data ? String(expense.data).split("T")[0] : new Date().toISOString().split("T")[0],
      created_at: expense.created_at || new Date().toISOString(),
    };
    setExpenses((prev) => {
      if (prev.some((g) => g.id === formatted.id)) return prev;
      return [formatted, ...prev];
    });
  }, []);

  const updateExpense = useCallback(async (updatedExpense) => {
    setExpenses((prev) =>
      prev.map((g) => (g.id === updatedExpense.id ? updatedExpense : g))
    );
    try {
      await authFetch(`${API_BASE}/api/gastos/${updatedExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedExpense),
      });
    } catch (err) {
      console.error("Error updating expense in backend:", err);
    }
  }, [API_BASE]);

  const deleteExpense = useCallback(async (id) => {
    setExpenses((prev) => prev.filter((g) => g.id !== id));
    try {
      await authFetch(`${API_BASE}/api/gastos/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error deleting expense in backend:", err);
    }
  }, [API_BASE]);

  const clearExpenses = useCallback(async () => {
    setExpenses([]);
    try {
      await authFetch(`${API_BASE}/api/gastos?mes=${dateFilter.mes + 1}&ano=${dateFilter.ano}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Error clearing expenses in backend:", err);
    }
  }, [API_BASE, dateFilter]);

  const setLimit = useCallback(async (category, amount) => {
    const catClean = (category || "geral").toLowerCase().trim();
    const valNumber = Number(amount) || 0;
    try {
      setLimits((prev) => ({ ...prev, [catClean]: valNumber }));
      await authFetch(`${API_BASE}/api/limites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: catClean, valor: valNumber }),
      });
    } catch (err) {
      console.error("Error setting limit in backend:", err);
    }
  }, [API_BASE]);

  const removeLimit = useCallback(async (category) => {
    const catClean = (category || "geral").toLowerCase().trim();
    try {
      setLimits((prev) => {
        const updated = { ...prev };
        delete updated[catClean];
        return updated;
      });
      await authFetch(`${API_BASE}/api/limites/${encodeURIComponent(catClean)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Error removing limit in backend:", err);
    }
  }, [API_BASE]);

  const parseExpenseYearMonth = (dateStr) => {
    if (!dateStr) return { ano: null, mes: null };
    const dateOnly = String(dateStr).split("T")[0];
    const parts = dateOnly.split("-");
    if (parts.length === 3) {
      return {
        ano: parseInt(parts[0], 10),
        mes: parseInt(parts[1], 10) - 1,
      };
    }
    const d = new Date(dateStr);
    return {
      ano: d.getFullYear(),
      mes: d.getMonth(),
    };
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((g) => {
      const { ano, mes } = parseExpenseYearMonth(g.data);
      return mes === dateFilter.mes && ano === dateFilter.ano;
    });
  }, [expenses, dateFilter]);

  const previousMonthExpenses = useMemo(() => {
    const prevMonth = dateFilter.mes === 0 ? 11 : dateFilter.mes - 1;
    const prevYear = dateFilter.mes === 0 ? dateFilter.ano - 1 : dateFilter.ano;
    return expenses.filter((g) => {
      const { ano, mes } = parseExpenseYearMonth(g.data);
      return mes === prevMonth && ano === prevYear;
    });
  }, [expenses, dateFilter]);

  const stats = useMemo(() => {
    return calculateStats(filteredExpenses, previousMonthExpenses);
  }, [filteredExpenses, previousMonthExpenses]);

  return {
    expenses,
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
    refetch,
  };
}
