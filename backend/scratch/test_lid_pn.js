/**
 * Test the full LID/PN resolution flow without needing the server running.
 */
const { resolveUserFromWhatsAppMessage, normalizeWhatsAppId } = require('../user');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("=== TESTE DE RESOLUÇÃO LID/PN ===\n");

  // 1. Simular mensagem onde remoteJid = LID e remoteJidAlt = PN real
  const remoteJid    = '70978780578011@lid';
  const remoteJidAlt = '5585986066467@s.whatsapp.net';

  console.log(`Simulando mensagem:`);
  console.log(`  remoteJid    = ${remoteJid}`);
  console.log(`  remoteJidAlt = ${remoteJidAlt}\n`);

  const user = await resolveUserFromWhatsAppMessage(remoteJid, remoteJidAlt);

  if (!user) {
    console.error("❌ FALHOU: nenhum usuário resolvido.");
  } else {
    console.log(`✅ Usuário resolvido:`);
    console.log(`   id          = ${user.id}`);
    console.log(`   whatsappId  = ${user.whatsappId}`);
    console.log(`   whatsappLid = ${user.whatsappLid || 'null'}`);

    const esperadoWhatsappId = '5585986066467';
    if (user.whatsappId === esperadoWhatsappId) {
      console.log(`\n✅ whatsappId correto: ${user.whatsappId}`);
    } else {
      console.error(`\n❌ whatsappId incorreto. Esperado: ${esperadoWhatsappId} | Recebido: ${user.whatsappId}`);
    }

    if (user.whatsappLid === '70978780578011') {
      console.log(`✅ whatsappLid armazenado corretamente: ${user.whatsappLid}`);
    } else {
      console.log(`⚠️  whatsappLid não armazenado ainda (será na próxima reinicialização do Prisma client)`);
    }
  }

  // 2. Simular mensagem PN normal (sem LID)
  const remoteJidPN = '5585986066467@s.whatsapp.net';
  console.log(`\nSimulando mensagem PN normal:`);
  console.log(`  remoteJid    = ${remoteJidPN}`);
  const userPN = await resolveUserFromWhatsAppMessage(remoteJidPN, undefined);
  if (userPN && userPN.whatsappId === '5585986066467') {
    console.log(`✅ PN normal resolvido corretamente: User.id = ${userPN.id}`);
  } else {
    console.error(`❌ PN normal NÃO resolvido.`);
  }

  // 3. Normalização
  console.log('\n=== TESTE NORMALIZEWHATSAPPID ===');
  const cases = [
    ['85986066467', '5585986066467'],
    ['5585986066467@s.whatsapp.net', '5585986066467'],
    ['558586066467@s.whatsapp.net', '5585986066467'],
    ['5511999999999', '5511999999999'],
  ];
  for (const [input, expected] of cases) {
    const result = normalizeWhatsAppId(input);
    const ok = result === expected;
    console.log(`${ok ? '✅' : '❌'} normalizeWhatsAppId("${input}") => "${result}" (esperado: "${expected}")`);
  }

  await prisma.$disconnect();
}

run().catch(err => {
  console.error("Erro:", err.message);
  process.exit(1);
});
