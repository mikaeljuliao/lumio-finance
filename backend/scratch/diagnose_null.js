const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("=== ÚLTIMOS GASTOS COM userId = NULL ===");
  const gastos = await prisma.gasto.findMany({
    where: { userId: null },
    orderBy: { data: 'desc', id: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(gastos, null, 2));

  console.log("\n=== ÚLTIMOS GASTOS GERAIS ===");
  const todos = await prisma.gasto.findMany({
    orderBy: { data: 'desc', id: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(todos, null, 2));

  await prisma.$disconnect();
}

run().catch(console.error);
