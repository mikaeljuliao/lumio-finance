import { useState, useEffect, useCallback, useMemo } from "react";
import { calculateStats } from "../lib/utils";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://powerful-essence-production-0894.up.railway.app"
).replace(/\/$/, "");

export function useGastos(filtroData) {
  const [gastos, setGastos] = useState([]);
  const [limites, setLimites] = useState({ geral: 2000 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGastosELimites = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [resGastos, resLimites] = await Promise.all([
        fetch(`${API_BASE}/api/gastos`),
        fetch(`${API_BASE}/api/limites`),
      ]);

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
      setError("Não foi possível carregar os dados. Conexão limitada.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGastosELimites();
  }, [fetchGastosELimites]);

  const addGasto = useCallback((novoGasto) => {
    const formatted = {
      id: novoGasto.id || Date.now(),
      valor: Number(novoGasto.valor),
      categoria: novoGasto.categoria || "outros",
      descricao: novoGasto.descricao || "Sem descrição",
      data: novoGasto.data ? String(novoGasto.data).split("T")[0] : new Date().toISOString().split("T")[0],
      created_at: novoGasto.created_at || novoGasto.criadoEm || new Date().toISOString(),
    };

    setGastos((prev) => {
      if (prev.some((g) => g.id === formatted.id)) {
        return prev;
      }
      return [formatted, ...prev];
    });
  }, []);

  const updateGasto = useCallback((gastoAtualizado) => {
    setGastos((prev) =>
      prev.map((g) =>
        g.id === gastoAtualizado.id
          ? {
              ...gastoAtualizado,
              valor: Number(gastoAtualizado.valor),
              data: String(gastoAtualizado.data).split("T")[0],
            }
          : g
      )
    );
  }, []);

  const deleteGasto = useCallback((id) => {
    setGastos((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const clearGastos = useCallback(() => {
    setGastos([]);
  }, []);

  const setLimite = useCallback(async (categoria, valor) => {
    const catClean = (categoria || "geral").toLowerCase().trim();
    const valNumber = Number(valor) || 0;
    try {
      setLimites((prev) => ({ ...prev, [catClean]: valNumber }));
      await fetch(`${API_BASE}/api/limites`, {
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
      await fetch(`${API_BASE}/api/limites/${encodeURIComponent(catClean)}`, {
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
    updateGasto,
    deleteGasto,
    clearGastos,
    setLimite,
    removeLimite,
    refetch: fetchGastosELimites,
  };
}
