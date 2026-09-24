const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("=== USERS ===");
  const users = await prisma.user.findMany();
  console.log(JSON.stringify(users, null, 2));

  console.log("\n=== GASTOS (últimos 10) ===");
  const gastos = await prisma.gasto.findMany({
    orderBy: { data: 'desc' },
    take: 10
  });
  console.log(JSON.stringify(gastos, null, 2));

  console.log("\n=== SOMA DE GASTOS POR USER ===");
  const somaGastos = await prisma.gasto.groupBy({
    by: ['userId'],
    _sum: {
      valor: true
    }
  });
  console.log(JSON.stringify(somaGastos, null, 2));

  console.log("\n=== LIMITES ===");
  const limites = await prisma.limite.findMany();
  console.log(JSON.stringify(limites, null, 2));

  await prisma.$disconnect();
}

run().catch(console.error);
