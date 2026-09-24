const prisma = require('../config/prisma');

async function createExpense(userId, data) {
  if (!userId) throw new Error('userId is required to save an expense');

  const expenseDate = data.data ? new Date(data.data + 'T00:00:00Z') : new Date();

  return await prisma.gasto.create({
    data: {
      userId,
      valor: data.valor,
      categoria: data.categoria,
      descricao: data.descricao,
      data: expenseDate,
    },
  });
}

async function findAllExpenses(userId) {
  if (!userId) return [];
  return await prisma.gasto.findMany({
    where: { userId },
    orderBy: { data: 'desc' },
  });
}

async function findExpensesByMonth(userId, month, year) {
  if (!userId) return [];
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return await prisma.gasto.findMany({
    where: {
      userId,
      data: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    orderBy: { data: 'desc' },
  });
}

async function updateExpense(userId, id, data) {
  if (!userId || !id) throw new Error('userId and id are required');
  const expenseDate = data.data ? new Date(data.data + 'T00:00:00Z') : undefined;

  return await prisma.gasto.updateMany({
    where: { id: Number(id), userId },
    data: {
      valor: data.valor !== undefined ? data.valor : undefined,
      categoria: data.categoria || undefined,
      descricao: data.descricao || undefined,
      data: expenseDate,
    },
  });
}

async function deleteExpense(userId, id) {
  if (!userId || !id) throw new Error('userId and id are required');
  return await prisma.gasto.deleteMany({
    where: { id: Number(id), userId },
  });
}

async function clearExpensesByMonth(userId, month, year) {
  if (!userId) return { count: 0 };
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return await prisma.gasto.deleteMany({
    where: {
      userId,
      data: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });
}

module.exports = {
  createExpense,
  findAllExpenses,
  findExpensesByMonth,
  updateExpense,
  deleteExpense,
  clearExpensesByMonth,
};
