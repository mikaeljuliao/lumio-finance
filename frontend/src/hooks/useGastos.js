import { useState, useEffect, useCallback, useMemo } from "react";
import { calculateStats } from "../lib/utils";

const API_BASE = "http://localhost:3001/api";

export function useGastos(filtroData) {
  const [gastos, setGastos] = useState([]);
  const [limites, setLimites] = useState({ geral: 2000 });

  const fetchGastosELimites = useCallback(async () => {
    try {
      const [resGastos, resLimites] = await Promise.all([
        fetch(`${API_BASE}/gastos`),
        fetch(`${API_BASE}/limites`),
      ]);
      if (resGastos.ok) {
        const dataGastos = await resGastos.json();
        setGastos(
          dataGastos.map((g) => ({
            id: g.id,
            valor: Number(g.valor),
            categoria: g.categoria,
            descricao: g.descricao,
            data: g.data ? String(g.data).split("T")[0] : new Date().toISOString().split("T")[0],
            created_at: g.criadoEm || new Date().toISOString(),
          }))
        );
      }
      if (resLimites.ok) {
        const dataLimites = await resLimites.json();
        setLimites(dataLimites);
      }
    } catch (err) {
      console.error("Erro ao buscar dados do backend:", err);
    }
  }, []);

  useEffect(() => {
    fetchGastosELimites();
  }, [fetchGastosELimites]);

  const addGasto = useCallback((novoGasto) => {
    setGastos((prev) => [
      {
        id: novoGasto.id,
        valor: Number(novoGasto.valor),
        categoria: novoGasto.categoria,
        descricao: novoGasto.descricao,
        data: novoGasto.data ? String(novoGasto.data).split("T")[0] : new Date().toISOString().split("T")[0],
        created_at: novoGasto.created_at || new Date().toISOString(),
      },
      ...prev,
    ]);
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
      await fetch(`${API_BASE}/limites`, {
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
      await fetch(`${API_BASE}/limites/${encodeURIComponent(categoria)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Erro ao remover limite no backend:", err);
    }
  }, []);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      const d = new Date(g.data);
      return d.getMonth() === filtroData.mes && d.getFullYear() === filtroData.ano;
    });
  }, [gastos, filtroData]);

  const gastosMesAnterior = useMemo(() => {
    const mesAnterior = filtroData.mes === 0 ? 11 : filtroData.mes - 1;
    const anoAnterior = filtroData.mes === 0 ? filtroData.ano - 1 : filtroData.ano;
    return gastos.filter((g) => {
      const d = new Date(g.data);
      return d.getMonth() === mesAnterior && d.getFullYear() === anoAnterior;
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
