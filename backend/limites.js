/**
 * limites.js — Sistema de limites financeiros por categoria.
 * Os limites são salvos em limites.json na pasta do backend.
 */

const fs = require('fs');
const path = require('path');

const ARQUIVO_LIMITES = path.join(__dirname, 'limites.json');

function carregarLimites() {
  try {
    if (!fs.existsSync(ARQUIVO_LIMITES)) return {};
    return JSON.parse(fs.readFileSync(ARQUIVO_LIMITES, 'utf-8'));
  } catch {
    return {};
  }
}

function salvarLimites(limites) {
  fs.writeFileSync(ARQUIVO_LIMITES, JSON.stringify(limites, null, 2), 'utf-8');
}

function definirLimite(categoria, valor) {
  const limites = carregarLimites();
  limites[categoria.toLowerCase()] = Number(valor);
  salvarLimites(limites);
}

function removerLimite(categoria) {
  const limites = carregarLimites();
  delete limites[categoria.toLowerCase()];
  salvarLimites(limites);
}

function listarLimites() {
  return carregarLimites();
}

function verificarLimites(valorGasto, categoriaGasto, gastosDoMes) {
  const limites = carregarLimites();
  const alertas = [];

  const totalMes = gastosDoMes.reduce((acc, g) => acc + Number(g.valor), 0);
  const totalCategoria = gastosDoMes
    .filter(g => g.categoria === categoriaGasto)
    .reduce((acc, g) => acc + Number(g.valor), 0);

  if (limites['geral']) {
    const perc = (totalMes / limites['geral']) * 100;
    if (perc >= 100) {
      alertas.push(`🚨 *LIMITE GERAL ATINGIDO!*\nVocê gastou R$ ${totalMes.toFixed(2)} de R$ ${limites['geral'].toFixed(2)} no mês.`);
    } else if (perc >= 80) {
      alertas.push(`⚠️ *Atenção: ${perc.toFixed(0)}% do limite geral usado!*\nGasto: R$ ${totalMes.toFixed(2)} / Limite: R$ ${limites['geral'].toFixed(2)}`);
    }
  }

  if (limites[categoriaGasto]) {
    const percCat = (totalCategoria / limites[categoriaGasto]) * 100;
    if (percCat >= 100) {
      alertas.push(`🚩 *Limite de "${categoriaGasto}" atingido!*\nGasto: R$ ${totalCategoria.toFixed(2)} / Limite: R$ ${limites[categoriaGasto].toFixed(2)}`);
    } else if (percCat >= 80) {
      alertas.push(`⚠️ *${percCat.toFixed(0)}% do limite de "${categoriaGasto}" usado!*\nGasto: R$ ${totalCategoria.toFixed(2)} / Limite: R$ ${limites[categoriaGasto].toFixed(2)}`);
    }
  }

  return alertas;
}

function formatarLimites(limites) {
  const entradas = Object.entries(limites);
  if (entradas.length === 0) return 'Nenhum limite definido.';
  return entradas
    .map(([cat, val]) => `• *${cat}*: R$ ${Number(val).toFixed(2)}`)
    .join('\n');
}

module.exports = {
  definirLimite,
  removerLimite,
  listarLimites,
  verificarLimites,
  formatarLimites,
};
