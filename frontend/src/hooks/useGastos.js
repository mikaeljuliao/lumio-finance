import { useState, useEffect, useCallback, useMemo } from "react";
import { storageService } from "../services/storage";
import { calculateStats } from "../lib/utils";

export function useGastos(filtroData) {
  const [gastos, setGastos] = useState([]);
  const [limites, setLimites] = useState({ geral: 2000 });

  useEffect(() => {
    setGastos(storageService.getGastos());
    setLimites(storageService.getLimites());
  }, []);

  const addGasto = useCallback((novoGasto) => {
    setGastos((prev) => {
      const atualizados = [novoGasto, ...prev];
      storageService.saveGastos(atualizados);
      return atualizados;
    });
  }, []);

  const updateGasto = useCallback((gastoAtualizado) => {
    setGastos((prev) => {
      const atualizados = prev.map((g) =>
        g.id === gastoAtualizado.id ? gastoAtualizado : g
      );
      storageService.saveGastos(atualizados);
      return atualizados;
    });
  }, []);

  const deleteGasto = useCallback((id) => {
    setGastos((prev) => {
      const atualizados = prev.filter((g) => g.id !== id);
      storageService.saveGastos(atualizados);
      return atualizados;
    });
  }, []);

  const clearGastos = useCallback(() => {
    setGastos([]);
    storageService.clearAllGastos();
  }, []);

  const setLimite = useCallback((categoria, valor) => {
    setLimites((prev) => {
      const atualizados = { ...prev, [categoria]: valor };
      storageService.saveLimites(atualizados);
      return atualizados;
    });
  }, []);

  const removeLimite = useCallback((categoria) => {
    setLimites((prev) => {
      const atualizados = { ...prev };
      delete atualizados[categoria];
      storageService.saveLimites(atualizados);
      return atualizados;
    });
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
    removeLimite
  };
}
