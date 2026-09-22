/**
 * limites.js — Operações de limites financeiros via Prisma.
 */
const prisma = require('./database');

async function definirLimite(categoria, valor) {
  const cat = categoria.toLowerCase().trim();
  return await prisma.limite.upsert({
    where: { categoria: cat },
    update: { valor: Number(valor) },
    create: { categoria: cat, valor: Number(valor) },
  });
}

async function removerLimite(categoria) {
  const cat = categoria.toLowerCase().trim();
  return await prisma.limite.deleteMany({
    where: { categoria: cat },
  });
}

async function buscarTodosLimites() {
  const registros = await prisma.limite.findMany();
  const mapa = {};
  for (const item of registros) {
    mapa[item.categoria] = Number(item.valor);
  }
  return mapa;
}

async function verificarLimites(valorGasto, categoriaGasto, mes, ano) {
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
  const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

  const [limites, gastosDoMes] = await Promise.all([
    buscarTodosLimites(),
    prisma.gasto.findMany({
      where: {
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
    .map(([cat, val]) => `• *${cat}*: R$ ${Number(val).toFixed(2)}`)
    .join('\n');
}

module.exports = {
  definirLimite,
  removerLimite,
  buscarTodosLimites,
  verificarLimites,
  formatarLimites,
};
