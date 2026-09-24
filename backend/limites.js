/**
 * limites.js — Operações de limites financeiros via Prisma com isolamento por userId.
 */
const prisma = require('./database');

async function definirLimite(userId, categoria, valor) {
  if (!userId) throw new Error('userId é obrigatório para definir limite');
  const cat = categoria.toLowerCase().trim();

  return await prisma.limite.upsert({
    where: {
      userId_categoria: {
        userId,
        categoria: cat,
      },
    },
    update: { valor: Number(valor) },
    create: {
      userId,
      categoria: cat,
      valor: Number(valor),
    },
  });
}

async function removerLimite(userId, categoria) {
  if (!userId) return { count: 0 };
  const cat = categoria.toLowerCase().trim();
  return await prisma.limite.deleteMany({
    where: { userId, categoria: cat },
  });
}

async function buscarTodosLimites(userId) {
  if (!userId) return {};
  const registros = await prisma.limite.findMany({
    where: { userId },
  });
  const mapa = {};
  for (const item of registros) {
    mapa[item.categoria] = Number(item.valor);
  }
  return mapa;
}

async function verificarLimites(userId, valorGasto, categoriaGasto, mes, ano) {
  if (!userId) return [];
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
  const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

  const [limites, gastosDoMes] = await Promise.all([
    buscarTodosLimites(userId),
    prisma.gasto.findMany({
      where: {
        userId,
        data: {
          gte: inicioMes,
          lte: fimMes,
        },
      },
    }),
  ]);

  const alertas = [];
  const catNormalizada = (categoriaGasto || '').toLowerCase().trim();

  const totalMes = gastosDoMes.reduce((acc, g) => acc + Number(g.valor), 0);
  const totalCategoria = gastosDoMes
    .filter(g => (g.categoria || '').toLowerCase().trim() === catNormalizada)
    .reduce((acc, g) => acc + Number(g.valor), 0);

  if (limites['geral']) {
    const perc = (totalMes / limites['geral']) * 100;
    if (perc >= 100) {
      alertas.push(`🚨 *LIMITE GERAL ATINGIDO!*\nVocê gastou R$ ${totalMes.toFixed(2)} de R$ ${limites['geral'].toFixed(2)} no mês.`);
    } else if (perc >= 80) {
      alertas.push(`⚠️ *Atenção: ${perc.toFixed(0)}% do limite geral usado!*\nGasto: R$ ${totalMes.toFixed(2)} / Limite: R$ ${limites['geral'].toFixed(2)}`);
    }
  }

  if (limites[catNormalizada]) {
    const limiteCat = limites[catNormalizada];
    const percCat = (totalCategoria / limiteCat) * 100;
    if (percCat >= 100) {
      alertas.push(`🚩 *Limite de "${catNormalizada}" atingido!*\nGasto: R$ ${totalCategoria.toFixed(2)} / Limite: R$ ${limiteCat.toFixed(2)}`);
    } else if (percCat >= 80) {
      alertas.push(`⚠️ *${percCat.toFixed(0)}% do limite de "${catNormalizada}" usado!*\nGasto: R$ ${totalCategoria.toFixed(2)} / Limite: R$ ${limiteCat.toFixed(2)}`);
    }
  }

  return alertas;
}

function formatarLimites(limites) {
  const entradas = Object.entries(limites);
  if (entradas.length === 0) return 'Nenhum limite definido.';
  return entradas
    .map(([cat, val]) => {
      const label = cat === 'geral' ? 'Geral (Carteira)' : cat;
      return `• *${label}*: R$ ${Number(val).toFixed(2)}`;
    })
    .join('\n');
}

module.exports = {
  definirLimite,
  removerLimite,
  buscarTodosLimites,
  verificarLimites,
  formatarLimites,
};
