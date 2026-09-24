const prisma = require('../config/prisma');

async function setLimit(userId, category, amount) {
  if (!userId) throw new Error('userId is required to set limit');
  const cat = category.toLowerCase().trim();

  return await prisma.limite.upsert({
    where: {
      userId_categoria: {
        userId,
        categoria: cat,
      },
    },
    update: { valor: Number(amount) },
    create: {
      userId,
      categoria: cat,
      valor: Number(amount),
    },
  });
}

async function removeLimit(userId, category) {
  if (!userId) return { count: 0 };
  const cat = category.toLowerCase().trim();
  return await prisma.limite.deleteMany({
    where: { userId, categoria: cat },
  });
}

async function findAllLimits(userId) {
  if (!userId) return {};
  const records = await prisma.limite.findMany({
    where: { userId },
  });
  const map = {};
  for (const item of records) {
    map[item.categoria] = Number(item.valor);
  }
  return map;
}

async function checkLimits(userId, expenseAmount, expenseCategory, month, year) {
  if (!userId) return [];
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [limits, monthExpenses] = await Promise.all([
    findAllLimits(userId),
    prisma.gasto.findMany({
      where: {
        userId,
        data: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),
  ]);

  const alerts = [];
  const normalizedCategory = (expenseCategory || '').toLowerCase().trim();

  const totalMonth = monthExpenses.reduce((acc, g) => acc + Number(g.valor), 0);
  const totalCategory = monthExpenses
    .filter(g => (g.categoria || '').toLowerCase().trim() === normalizedCategory)
    .reduce((acc, g) => acc + Number(g.valor), 0);

  if (limits['geral']) {
    const perc = (totalMonth / limits['geral']) * 100;
    if (perc >= 100) {
      alerts.push(`🚨 *LIMITE GERAL ATINGIDO!*\nVocê gastou R$ ${totalMonth.toFixed(2)} de R$ ${limits['geral'].toFixed(2)} no mês.`);
    } else if (perc >= 80) {
      alerts.push(`⚠️ *Atenção: ${perc.toFixed(0)}% do limite geral usado!*\nGasto: R$ ${totalMonth.toFixed(2)} / Limite: R$ ${limits['geral'].toFixed(2)}`);
    }
  }

  if (limits[normalizedCategory]) {
    const catLimit = limits[normalizedCategory];
    const percCat = (totalCategory / catLimit) * 100;
    if (percCat >= 100) {
      alerts.push(`🚩 *Limite de "${normalizedCategory}" atingido!*\nGasto: R$ ${totalCategory.toFixed(2)} / Limite: R$ ${catLimit.toFixed(2)}`);
    } else if (percCat >= 80) {
      alerts.push(`⚠️ *${percCat.toFixed(0)}% do limite de "${normalizedCategory}" usado!*\nGasto: R$ ${totalCategory.toFixed(2)} / Limite: R$ ${catLimit.toFixed(2)}`);
    }
  }

  return alerts;
}

function formatLimits(limits) {
  const entries = Object.entries(limits);
  if (entries.length === 0) return 'Nenhum limite definido.';
  return entries
    .map(([cat, val]) => {
      const label = cat === 'geral' ? 'Geral (Carteira)' : cat;
      return `• *${label}*: R$ ${Number(val).toFixed(2)}`;
    })
    .join('\n');
}

module.exports = {
  setLimit,
  removeLimit,
  findAllLimits,
  checkLimits,
  formatLimits,
};
