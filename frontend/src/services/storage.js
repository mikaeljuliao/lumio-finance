const GASTOS_KEY = "gastos_v1";
const LIMITES_KEY = "limites_v1";

export const storageService = {
  getGastos() {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(GASTOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveGastos(gastos) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(GASTOS_KEY, JSON.stringify(gastos));
    } catch (error) {
      console.error("Erro ao salvar gastos no storage:", error);
    }
  },

  getLimites() {
    if (typeof window === "undefined") return { geral: 2000 };
    try {
      const data = localStorage.getItem(LIMITES_KEY);
      return data ? JSON.parse(data) : { geral: 2000 };
    } catch {
      return { geral: 2000 };
    }
  },

  saveLimites(limites) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LIMITES_KEY, JSON.stringify(limites));
    } catch (error) {
      console.error("Erro ao salvar limites no storage:", error);
    }
  },

  clearAllGastos() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(GASTOS_KEY);
    } catch (error) {
      console.error("Erro ao limpar gastos:", error);
    }
  }
};
