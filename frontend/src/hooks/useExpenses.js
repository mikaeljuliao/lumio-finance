import { useState, useEffect, useCallback, useMemo, startTransition } from "react";
import { calculateStats } from "../lib/utils";
import { getApiBaseUrl, authFetch } from "../lib/config";

async function requestApi(url, options, fallbackMessage, onSessionExpired) {
  let response;

  try {
    response = await authFetch(url, options);
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
  }

  if (response.status === 401) {
    onSessionExpired?.();
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }

  if (!response.ok) {
    let message = fallbackMessage;
    try {
      const data = await response.json();
      if (typeof data.error === "string" && data.error.trim()) {
        message = data.error;
      }
    } catch {}
    throw new Error(message);
  }

  return response;
}

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

    const failedRequest = [
      { response: resExpenses, message: "Não foi possível carregar os gastos." },
      { response: resLimits, message: "Não foi possível carregar os limites." }
    ].find(({ response }) => !response.ok);

    if (failedRequest) {
      let message = failedRequest.message;
      try {
        const data = await failedRequest.response.json();
        if (typeof data.error === "string" && data.error.trim()) {
          message = data.error;
        }
      } catch {}
      throw new Error(message);
    }

    const [dataExpenses, dataLimits] = await Promise.all([
      resExpenses.json(),
      resLimits.json(),
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
    setError(err.message || "Não foi possível carregar os dados. Tente novamente.");
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
      const res = await requestApi(`${API_BASE}/api/gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatted),
      }, "Não foi possível salvar o gasto.", onSessionExpired);
      const created = await res.json();
      setExpenses((prev) => {
        if (prev.some((g) => g.id === created.id)) return prev;
        return [created, ...prev];
      });
      return created;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("O servidor retornou uma resposta inválida. O gasto não foi confirmado.");
      }
      throw error;
    }
  }, [API_BASE, onSessionExpired]);

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
    const previousIndex = expenses.findIndex((expense) => expense.id === updatedExpense.id);
    const previousExpense = expenses[previousIndex];
    if (!previousExpense) {
      throw new Error("Este gasto não está mais disponível para atualização.");
    }

    setExpenses((prev) =>
      prev.map((g) => (g.id === updatedExpense.id ? updatedExpense : g))
    );
    try {
      await requestApi(`${API_BASE}/api/gastos/${updatedExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedExpense),
      }, "Não foi possível atualizar o gasto.", onSessionExpired);
    } catch (error) {
      setExpenses((current) => {
        const currentIndex = current.findIndex((expense) => expense.id === updatedExpense.id);
        if (currentIndex < 0) {
          const restored = [...current];
          restored.splice(Math.min(previousIndex, restored.length), 0, previousExpense);
          return restored;
        }
        return current.map((expense) =>
          expense.id === updatedExpense.id ? previousExpense : expense
        );
      });
      throw error;
    }
  }, [API_BASE, expenses, onSessionExpired]);

  const deleteExpense = useCallback(async (id) => {
    const previousIndex = expenses.findIndex((expense) => expense.id === id);
    const previousExpense = expenses[previousIndex];
    if (!previousExpense) {
      throw new Error("Este gasto não está mais disponível para exclusão.");
    }

    setExpenses((prev) => prev.filter((g) => g.id !== id));
    try {
      await requestApi(
        `${API_BASE}/api/gastos/${id}`,
        { method: "DELETE" },
        "Não foi possível excluir o gasto.",
        onSessionExpired
      );
    } catch (error) {
      setExpenses((current) => {
        if (current.some((expense) => expense.id === id)) return current;
        const restored = [...current];
        restored.splice(Math.min(previousIndex, restored.length), 0, previousExpense);
        return restored;
      });
      throw error;
    }
  }, [API_BASE, expenses, onSessionExpired]);

  const clearExpenses = useCallback(async () => {
    const isExpenseInMonth = (expense) => {
      const [year, month] = String(expense.data || "").split("T")[0].split("-");
      return Number(year) === dateFilter.ano && Number(month) === dateFilter.mes + 1;
    };
    const removedExpenses = expenses
      .map((expense, index) => ({ expense, index }))
      .filter(({ expense }) => isExpenseInMonth(expense));

    setExpenses((current) =>
      current.filter((expense) => !isExpenseInMonth(expense))
    );

    try {
      await requestApi(
        `${API_BASE}/api/gastos?mes=${dateFilter.mes + 1}&ano=${dateFilter.ano}`,
        { method: "DELETE" },
        "Não foi possível limpar os gastos deste mês.",
        onSessionExpired
      );
    } catch (error) {
      setExpenses((current) => {
        const currentIds = new Set(current.map((expense) => expense.id));
        const missingExpenses = removedExpenses.filter(
          ({ expense }) => !currentIds.has(expense.id)
        );
        const restored = [...current];

        for (const { expense, index } of missingExpenses) {
          restored.splice(Math.min(index, restored.length), 0, expense);
        }

        return restored;
      });
      throw error;
    }
  }, [API_BASE, dateFilter, expenses, onSessionExpired]);

  const setLimit = useCallback(async (category, amount) => {
    const catClean = (category || "geral").toLowerCase().trim();
    const valNumber = Number(amount) || 0;
    const hadPreviousValue = Object.prototype.hasOwnProperty.call(limits, catClean);
    const previousValue = limits[catClean];

    setLimits((prev) => ({ ...prev, [catClean]: valNumber }));
    try {
      await requestApi(
        `${API_BASE}/api/limites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoria: catClean, valor: valNumber })
        },
        "Não foi possível salvar o limite.",
        onSessionExpired
      );
    } catch (error) {
      setLimits((current) => {
        if (current[catClean] !== valNumber) return current;
        const restored = { ...current };
        if (hadPreviousValue) {
          restored[catClean] = previousValue;
        } else {
          delete restored[catClean];
        }
        return restored;
      });
      throw error;
    }
  }, [API_BASE, limits, onSessionExpired]);

  const removeLimit = useCallback(async (category) => {
    const catClean = (category || "geral").toLowerCase().trim();
    const hadPreviousValue = Object.prototype.hasOwnProperty.call(limits, catClean);
    const previousValue = limits[catClean];

    setLimits((prev) => {
      const updated = { ...prev };
      delete updated[catClean];
      return updated;
    });
    try {
      await requestApi(
        `${API_BASE}/api/limites/${encodeURIComponent(catClean)}`,
        { method: "DELETE" },
        "Não foi possível remover o limite.",
        onSessionExpired
      );
    } catch (error) {
      if (hadPreviousValue) {
        setLimits((current) =>
          Object.prototype.hasOwnProperty.call(current, catClean)
            ? current
            : { ...current, [catClean]: previousValue }
        );
      }
      throw error;
    }
  }, [API_BASE, limits, onSessionExpired]);

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
