import { useState, useEffect, useCallback, useMemo } from "react";
import { calculateStats } from "../lib/utils";
import { getApiBaseUrl, authFetch } from "../lib/config";

export function useGastos(filtroData, isAuthenticated = true) {
  const API_BASE = getApiBaseUrl();
  const [gastos, setGastos] = useState([]);
  const [limites, setLimites] = useState({ geral: 2000 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGastosELimites = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [resGastos, resLimites] = await Promise.all([
        authFetch(`${API_BASE}/api/gastos`),
        authFetch(`${API_BASE}/api/limites`),
      ]);

      if (resGastos.status === 401 || resLimites.status === 401) {
        setError("SESSION_EXPIRED");
        setIsLoading(false);
        return;
      }

      if (resGastos.ok) {
        const dataGastos = await resGastos.json();
        if (Array.isArray(dataGastos)) {
          setGastos(
            dataGastos.map((g) => ({
              id: g.id,
              valor: Number(g.valor),
              categoria: g.categoria || "outros",
              descricao: g.descricao || "Sem descrição",
              data: g.data ? String(g.data).split("T")[0] : new Date().toISOString().split("T")[0],
              created_at: g.criadoEm || g.created_at || new Date().toISOString(),
            }))
          );
        }
      }

      if (resLimites.ok) {
        const dataLimites = await resLimites.json();
        if (dataLimites && typeof dataLimites === "object" && !Array.isArray(dataLimites)) {
          setLimites(dataLimites);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar dados do backend:", err);
      setError("Não foi possível carregar os dados.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchGastosELimites();
  }, [fetchGastosELimites]);

  const addGasto = useCallback(async (novoGasto) => {
    const formatted = {
      valor: Number(novoGasto.valor),
      categoria: novoGasto.categoria || "outros",
      descricao: novoGasto.descricao || "Sem descrição",
      data: novoGasto.data ? String(novoGasto.data).split("T")[0] : new Date().toISOString().split("T")[0],
    };

    try {
      const res = await authFetch(`${API_BASE}/api/gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatted),
      });
      if (res.ok) {
        const created = await res.json();
        setGastos((prev) => {
          if (prev.some((g) => g.id === created.id)) return prev;
          return [created, ...prev];
        });
      }
    } catch (err) {
      console.error("Erro ao salvar gasto no backend:", err);
    }
  }, []);

  // Adiciona gasto recebido em tempo real via Socket.IO (já persistido no DB)
  const addGastoFromSocket = useCallback((gasto) => {
    const formatted = {
      id: gasto.id,
      valor: Number(gasto.valor),
      categoria: gasto.categoria || "outros",
      descricao: gasto.descricao || "Sem descrição",
      data: gasto.data ? String(gasto.data).split("T")[0] : new Date().toISOString().split("T")[0],
      created_at: gasto.created_at || new Date().toISOString(),
    };
    setGastos((prev) => {
      if (prev.some((g) => g.id === formatted.id)) return prev;
      return [formatted, ...prev];
    });
  }, []);

  const updateGasto = useCallback(async (gastoAtualizado) => {
    setGastos((prev) =>
      prev.map((g) => (g.id === gastoAtualizado.id ? gastoAtualizado : g))
    );
    try {
      await authFetch(`${API_BASE}/api/gastos/${gastoAtualizado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gastoAtualizado),
      });
    } catch (err) {
      console.error("Erro ao atualizar gasto no backend:", err);
    }
  }, []);

  const deleteGasto = useCallback(async (id) => {
    setGastos((prev) => prev.filter((g) => g.id !== id));
    try {
      await authFetch(`${API_BASE}/api/gastos/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Erro ao deletar gasto no backend:", err);
    }
  }, []);

  const clearGastos = useCallback(async () => {
    setGastos([]);
    try {
      await authFetch(`${API_BASE}/api/gastos?mes=${filtroData.mes + 1}&ano=${filtroData.ano}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Erro ao limpar gastos no backend:", err);
    }
  }, [filtroData]);

  const setLimite = useCallback(async (categoria, valor) => {
    const catClean = (categoria || "geral").toLowerCase().trim();
    const valNumber = Number(valor) || 0;
    try {
      setLimites((prev) => ({ ...prev, [catClean]: valNumber }));
      await authFetch(`${API_BASE}/api/limites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: catClean, valor: valNumber }),
      });
    } catch (err) {
      console.error("Erro ao definir limite no backend:", err);
    }
  }, []);

  const removeLimite = useCallback(async (categoria) => {
    const catClean = (categoria || "geral").toLowerCase().trim();
    try {
      setLimites((prev) => {
        const atualizados = { ...prev };
        delete atualizados[catClean];
        return atualizados;
      });
      await authFetch(`${API_BASE}/api/limites/${encodeURIComponent(catClean)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Erro ao remover limite no backend:", err);
    }
  }, []);

  const parseGastoYearMonth = (dataStr) => {
    if (!dataStr) return { ano: null, mes: null };
    const dateOnly = String(dataStr).split("T")[0];
    const parts = dateOnly.split("-");
    if (parts.length === 3) {
      return {
        ano: parseInt(parts[0], 10),
        mes: parseInt(parts[1], 10) - 1,
      };
    }
    const d = new Date(dataStr);
    return {
      ano: d.getFullYear(),
      mes: d.getMonth(),
    };
  };

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      const { ano, mes } = parseGastoYearMonth(g.data);
      return mes === filtroData.mes && ano === filtroData.ano;
    });
  }, [gastos, filtroData]);

  const gastosMesAnterior = useMemo(() => {
    const mesAnterior = filtroData.mes === 0 ? 11 : filtroData.mes - 1;
    const anoAnterior = filtroData.mes === 0 ? filtroData.ano - 1 : filtroData.ano;
    return gastos.filter((g) => {
      const { ano, mes } = parseGastoYearMonth(g.data);
      return mes === mesAnterior && ano === anoAnterior;
    });
  }, [gastos, filtroData]);

  const stats = useMemo(() => {
    return calculateStats(gastosFiltrados, gastosMesAnterior);
  }, [gastosFiltrados, gastosMesAnterior]);

  return {
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
    removeLimite,
    refetch: fetchGastosELimites,
  };
}
