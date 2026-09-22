/**
 * gastos.js — Persistência temporária de gastos em arquivo JSON.
 * Esta solução será substituída por PostgreSQL + Prisma no próximo passo.
 */

const fs = require('fs');
const path = require('path');

const ARQUIVO_GASTOS = path.join(__dirname, 'gastos_local.json');

function carregarGastos() {
  try {
    if (!fs.existsSync(ARQUIVO_GASTOS)) return [];
    return JSON.parse(fs.readFileSync(ARQUIVO_GASTOS, 'utf-8'));
  } catch {
    return [];
  }
}

function salvarGasto(gasto) {
  const gastos = carregarGastos();
  const novoGasto = { ...gasto, id: Date.now().toString() };
  gastos.push(novoGasto);
  fs.writeFileSync(ARQUIVO_GASTOS, JSON.stringify(gastos, null, 2), 'utf-8');
  return novoGasto;
}

function gastosDoMesAtual(todosGastos) {
  const agora = new Date();
  const anoMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  return todosGastos.filter(g => g.data && g.data.startsWith(anoMes));
}

module.exports = { carregarGastos, salvarGasto, gastosDoMesAtual };
