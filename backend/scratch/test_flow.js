const { normalizeWhatsAppId, findOrCreateUserByWhatsAppId } = require('../user');
const { salvarGasto, buscarTodosGastos } = require('../gastos');
const { loginWithPhone } = require('../auth');

async function runTest() {
  console.log("=== INICIANDO TESTE DO FLUXO MULTIUSUÁRIO ===");

  // 1. Simular Web Login com número 11 dígitos
  const numeroWeb = '85987654321'; // 11 dígitos
  console.log(`\n[Web] Usuário digitou no login: ${numeroWeb}`);
  
  const loginResult = await loginWithPhone(numeroWeb);
  const webUserId = loginResult.user.id;
  const webUserWhatsappId = loginResult.user.whatsappId;
  
  console.log(`[Web] Normalizado para: ${webUserWhatsappId}`);
  console.log(`[Web] User.id autenticado: ${webUserId}`);

  // 2. Simular recebimento do WhatsApp de outro celular sem o 9º dígito
  const remoteJid = '558587654321@s.whatsapp.net'; // 12 dígitos sem o 9 extra
  console.log(`\n[WhatsApp] Baileys recebeu mensagem de: ${remoteJid}`);
  
  const normalizedFromWhatsApp = normalizeWhatsAppId(remoteJid);
  console.log(`[WhatsApp] Normalizado para: ${normalizedFromWhatsApp}`);
  
  if (normalizedFromWhatsApp !== webUserWhatsappId) {
    console.error(`[ERRO] Normalizações não batem!`);
    return;
  }
  
  const userWhatsApp = await findOrCreateUserByWhatsAppId(remoteJid);
  console.log(`[WhatsApp] User.id encontrado pelo WhatsApp: ${userWhatsApp.id}`);

  // 3. Simular registro de gasto
  const dadosGasto = {
    valor: 45.90,
    categoria: 'alimentação',
    descricao: 'Pizza teste normalização',
    data: new Date().toISOString().split('T')[0]
  };
  console.log(`\n[WhatsApp] Registrando gasto de R$ 45.90...`);
  const gastoSalvo = await salvarGasto(userWhatsApp.id, dadosGasto);
  
  console.log(`[DB] Gasto criado com ID: ${gastoSalvo.id} e userId: ${gastoSalvo.userId}`);

  // 4. Simular Dashboard recarregando (F5)
  console.log(`\n[Web/Dashboard] F5 (GET /api/gastos) com sessão do User.id: ${webUserId}`);
  const gastosDashboard = await buscarTodosGastos(webUserId);
  
  const gastoEncontrado = gastosDashboard.find(g => g.id === gastoSalvo.id);
  if (gastoEncontrado) {
    console.log(`[Dashboard] ✅ Gasto de R$ ${gastoEncontrado.valor} encontrado na Dashboard do usuário!`);
  } else {
    console.log(`[Dashboard] ❌ Gasto não apareceu na Dashboard.`);
  }

  console.log("\n=== TESTE CONCLUÍDO COM SUCESSO ===");
  process.exit(0);
}

runTest().catch(err => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
