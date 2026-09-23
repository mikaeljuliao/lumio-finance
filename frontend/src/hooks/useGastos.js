import { useState, useEffect, useCallback, useMemo } from "react";
import { calculateStats } from "../lib/utils";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://powerful-essence-production-0894.up.railway.app"
).replace(/\/$/, "");

export function useGastos(filtroData) {
  const [gastos, setGastos] = useState([]);
  const [limites, setLimites] = useState({ geral: 2000 });

  const fetchGastosELimites = useCallback(async () => {
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
              categoria: g.categoria,
              descricao: g.descricao,
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
    }
  }, []);

  useEffect(() => {
    fetchGastosELimites();
  }, [fetchGastosELimites]);

  const addGasto = useCallback((novoGasto) => {
    const formatted = {
      id: novoGasto.id,
      valor: Number(novoGasto.valor),
      categoria: novoGasto.categoria,
      descricao: novoGasto.descricao,
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
      prev.map((g) => (g.id === gastoAtualizado.id ? gastoAtualizado : g))
    );
  }, []);

  const deleteGasto = useCallback((id) => {
    setGastos((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const clearGastos = useCallback(() => {
    setGastos([]);
  }, []);

  const setLimite = useCallback(async (categoria, valor) => {
    try {
      setLimites((prev) => ({ ...prev, [categoria]: Number(valor) }));
      await fetch(`${API_BASE}/api/limites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria, valor }),
      });
    } catch (err) {
      console.error("Erro ao definir limite no backend:", err);
    }
  }, []);

  const removeLimite = useCallback(async (categoria) => {
    try {
      setLimites((prev) => {
        const atualizados = { ...prev };
        delete atualizados[categoria];
        return atualizados;
      });
      await fetch(`${API_BASE}/api/limites/${encodeURIComponent(categoria)}`, {
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
    addGasto,
    updateGasto,
    deleteGasto,
    clearGastos,
    setLimite,
    removeLimite,
    refetch: fetchGastosELimites,
  };
}

