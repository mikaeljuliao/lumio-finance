/**
 * gastos.js — Operações de persistência de gastos via Prisma.
 */
const prisma = require('./database');

async function salvarGasto(dados) {
  // Converte data "YYYY-MM-DD" para Date UTC
  const dataGasto = dados.data ? new Date(dados.data + 'T00:00:00Z') : new Date();

  return await prisma.gasto.create({
    data: {
      valor: dados.valor,
      categoria: dados.categoria,
      descricao: dados.descricao,
      data: dataGasto,
    },
  });
}

async function buscarTodosGastos() {
  return await prisma.gasto.findMany({
    orderBy: { data: 'desc' },
  });
}

async function buscarGastosDoMes(mes, ano) {
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
  const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

  return await prisma.gasto.findMany({
    where: {
      data: {
        gte: inicioMes,
        lte: fimMes,
      },
    },
    orderBy: { data: 'desc' },
  });
}

module.exports = {
  salvarGasto,
  buscarTodosGastos,
  buscarGastosDoMes,
};
