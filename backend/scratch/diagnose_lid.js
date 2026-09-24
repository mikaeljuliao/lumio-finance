const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    where: {
      whatsappId: '70978780578011'
    }
  });
  console.log("=== USUÁRIO ENCONTRADO ===");
  console.log(JSON.stringify(users, null, 2));

  if (users.length > 0) {
    const gastos = await prisma.gasto.findMany({
      where: { userId: users[0].id },
      orderBy: { id: 'desc' },
      take: 5
    });
    console.log("\n=== GASTOS DESSE USUÁRIO ===");
    console.log(JSON.stringify(gastos, null, 2));
  }

  await prisma.$disconnect();
}

run().catch(console.error);
