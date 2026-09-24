/**
 * gastos.js — Operações de persistência de gastos via Prisma com isolamento por userId.
 */
const prisma = require('./database');

async function salvarGasto(userId, dados) {
  if (!userId) throw new Error('userId é obrigatório para salvar gasto');

  const dataGasto = dados.data ? new Date(dados.data + 'T00:00:00Z') : new Date();

  return await prisma.gasto.create({
    data: {
      userId,
      valor: dados.valor,
      categoria: dados.categoria,
      descricao: dados.descricao,
      data: dataGasto,
    },
  });
}

async function buscarTodosGastos(userId) {
  if (!userId) return [];
  return await prisma.gasto.findMany({
    where: { userId },
    orderBy: { data: 'desc' },
  });
}

async function buscarGastosDoMes(userId, mes, ano) {
  if (!userId) return [];
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
  const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

  return await prisma.gasto.findMany({
    where: {
      userId,
      data: {
        gte: inicioMes,
        lte: fimMes,
      },
    },
    orderBy: { data: 'desc' },
  });
}

async function atualizarGasto(userId, id, dados) {
  if (!userId || !id) throw new Error('userId e id são obrigatórios');
  const dataGasto = dados.data ? new Date(dados.data + 'T00:00:00Z') : undefined;

  return await prisma.gasto.updateMany({
    where: { id: Number(id), userId },
    data: {
      valor: dados.valor !== undefined ? dados.valor : undefined,
      categoria: dados.categoria || undefined,
      descricao: dados.descricao || undefined,
      data: dataGasto,
    },
  });
}

async function deletarGasto(userId, id) {
  if (!userId || !id) throw new Error('userId e id são obrigatórios');
  return await prisma.gasto.deleteMany({
    where: { id: Number(id), userId },
  });
}

async function limparGastosDoMes(userId, mes, ano) {
  if (!userId) return { count: 0 };
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
  const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

  return await prisma.gasto.deleteMany({
    where: {
      userId,
      data: {
        gte: inicioMes,
        lte: fimMes,
      },
    },
  });
}

module.exports = {
  salvarGasto,
  buscarTodosGastos,
  buscarGastosDoMes,
  atualizarGasto,
  deletarGasto,
  limparGastosDoMes,
};
