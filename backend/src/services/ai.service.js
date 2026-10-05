const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

console.log('[SYSTEM] Initializing AI Service');

const CATEGORIES_LIST = [
  'alimentação', 'transporte', 'lazer', 'saúde', 'moradia',
  'mercado', 'educação', 'serviços', 'compras', 'presentes',
  'viagem', 'investimentos', 'outros'
];

const CATEGORY_DICTIONARY = {
  'investimentos': ['ação', 'ações', 'fundo', 'fii', 'investimento', 'investir', 'bolsa', 'crypto', 'bitcoin', 'tesouro', 'selic', 'cdb'],
  'lazer': ['festa', 'balada', 'cinema', 'show', 'diversão', 'diversao', 'bar', 'cerveja', 'chope', 'chopp', 'rolê', 'game', 'playstation', 'steam', 'xbox'],
  'viagem': ['avião', 'hotel', 'airbnb', 'passagem', 'viagem', 'viajar', 'hospedagem', 'turismo', 'mala'],
  'educação': ['curso', 'faculdade', 'escola', 'aula', 'estudo', 'livro', 'mensalidade', 'udemy', 'alura', 'programação', 'dev', 'bootcamp'],
  'serviços': ['luz', 'água', 'gas', 'gás', 'energia', 'internet', 'wifi', 'assinatura', 'netflix', 'spotify', 'prime', 'mensalidade', 'celular', 'plano'],
  'moradia': ['aluguel', 'condomínio', 'condominio', 'iptu', 'reforma', 'móvel', 'casa', 'apartamento', 'quarto'],
  'alimentação': ['comida', 'lanche', 'salgado', 'pizza', 'ifood', 'rappi', 'restaurante', 'marmita', 'padaria', 'café', 'almoço', 'jantar'],
  'transporte': ['uber', '99', 'taxi', 'táxi', 'gasolina', 'combustível', 'onibus', 'ônibus', 'metrô', 'pedágio', 'estacionamento'],
  'saúde': ['remédio', 'remedio', 'farmácia', 'médico', 'dentista', 'hospital', 'exame', 'academia', 'suplemento', 'whey', 'psicólogo'],
  'mercado': ['mercado', 'supermercado', 'compras do mês', 'atacadão', 'feira', 'sacolão'],
  'compras': ['roupa', 'sapato', 'tênis', 'shopping', 'celular', 'fone', 'eletrônico', 'ferramenta', 'presente'],
  'presentes': ['presente', 'mimo', 'doação', 'lembrancinha', 'aniversário']
};

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function categorizeLocally(text) {
  const t = normalizeText(text);
  const explicitCategory = CATEGORIES_LIST.find(category =>
    new RegExp(`\\b${normalizeText(category)}\\b`).test(t)
  );
  if (explicitCategory) return explicitCategory;

  for (const [cat, words] of Object.entries(CATEGORY_DICTIONARY)) {
    if (words.some(w => t.includes(normalizeText(w)))) return cat;
  }
  return 'outros';
}

function parseAmountFromText(text) {
  const match = String(text || '').match(/\d[\d. ]*(?:,\d{1,2})?/);
  if (!match) return null;

  let amount = match[0].replace(/\s/g, '');
  if (amount.includes(',')) {
    amount = amount.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(amount)) {
    amount = amount.replace(/\./g, '');
  }

  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSimpleGreeting(text) {
  const normalized = normalizeText(text).replace(/[!?.,]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(oi|ola|opa|eai|e ae|bom dia|boa tarde|boa noite|tudo bem|obrigado|obrigada|valeu)(\s+(lumio|bot|kkk|haha))*$/.test(normalized);
}

function detectIntentLocally(text) {
  const normalized = normalizeText(text);
  if (isSimpleGreeting(normalized)) return { intencao: 'NAO_ENTENDIDA' };

  if (
    ((/\b(quais|ver|consultar|mostrar|liste|listar)\b/.test(normalized)) && /\blimites?\b/.test(normalized)) ||
    normalized.includes('quanto posso gastar')
  ) {
    return { intencao: 'VER_LIMITES' };
  }

  const amount = parseAmountFromText(text);
  if (/\blimite\b|\bmaximo\b|\bmaxima\b/.test(normalized)) {
    const category = categorizeLocally(text);
    const categoryFinal = category === 'outros' && !normalized.includes('outros') ? 'geral' : category;
    return { intencao: 'DEFINIR_LIMITE', valor: amount, categoria: categoryFinal };
  }

  const hasExpenseCue = /\b(gastei|paguei|comprei|custou|anota|registrar|registra|despesa|gasto)\b/.test(normalized);
  const hasKnownCategory = categorizeLocally(text) !== 'outros';
  if (hasExpenseCue || (amount !== null && hasKnownCategory)) {
    return { intencao: 'REGISTRAR_GASTO', valor: amount };
  }

  return { intencao: 'NAO_ENTENDIDA' };
}

const INTENT_PROMPT = `
Você é um cérebro financeiro. Analise a mensagem do usuário.
INTENÇÕES POSSÍVEIS:
1. "REGISTRAR_GASTO": Ex: "gastei 50 no bar", "paguei 100 de luz"
2. "DEFINIR_LIMITE": Ex: "limite de 500 em lazer", "meu limite geral é 2000", "definir limite 1500", "quero gastar no máximo 300 com mercado"
3. "VER_LIMITES": Ex: "quais meus limites?", "ver limites", "quanto posso gastar?"
4. "NAO_ENTENDIDA": Saudações, mensagens sem relação com as funções disponíveis ou pedidos que você não consegue atender.

Categorias permitidas: ${CATEGORIES_LIST.join(', ')}, geral.

REGRAS DE CATEGORIA PARA LIMITES:
- Se o limite for para uma categoria específica da lista (ex: mercado, lazer, alimentação, educação), retorne essa categoria em minúsculas.
- Se for um limite total/geral para a carteira inteira ou se não for informada uma categoria específica, retorne "geral".

Não invente valores. Se a pessoa demonstrar que quer registrar um gasto ou definir um limite, mas não informar o valor, mantenha a intenção e retorne "valor": null para que o sistema possa perguntar.
Retorne APENAS JSON no formato: {"intencao": "DEFINIR_LIMITE" | "REGISTRAR_GASTO" | "VER_LIMITES" | "NAO_ENTENDIDA", "valor": number | null, "categoria": "string"}
`;

async function detectIntent(text) {
  if (isSimpleGreeting(text)) return { intencao: 'NAO_ENTENDIDA' };

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(`${INTENT_PROMPT}\n\nMensagem: "${text}"`);
    const response = await result.response;
    let resText = response.text().trim();
    resText = resText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(resText);
    const supportedIntents = ['REGISTRAR_GASTO', 'DEFINIR_LIMITE', 'VER_LIMITES', 'NAO_ENTENDIDA'];
    return supportedIntents.includes(parsed.intencao) ? parsed : detectIntentLocally(text);
  } catch (e) {
    return detectIntentLocally(text);
  }
}

const EXPENSE_PROMPT = `
Você é um assistente financeiro de ELITE.
CATEGORIAS PERMITIDAS: ${CATEGORIES_LIST.join(', ')}

REGRAS DE OURO:
- "investimentos": Ações, fundos imobiliários (FII), cripto, qualquer aporte financeiro.
- "lazer": Gastos com diversão, bares, jogos, entretenimento.
- "serviços": Contas recorrentes (luz, água, internet, assinaturas de apps).
- "moradia": Aluguel, condomínio, IPTU.
- "viagem": Hotéis, passagens, gastos em trânsito de férias.

Retorne JSON: {"valor": num, "categoria": "string", "descricao": "string", "data": "YYYY-MM-DD"}
`;

async function extractExpense(messageText) {
  const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `${EXPENSE_PROMPT}\n\nMensagem: "${messageText}"`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);

      const localCat = categorizeLocally(messageText);
      if (localCat !== 'outros' && (parsed.categoria === 'outros' || parsed.categoria === 'moradia' || parsed.categoria === 'serviços')) {
        parsed.categoria = localCat;
      }

      if (parsed.valor) parsed.valor = Number(parsed.valor);
      return parsed;
    } catch (error) {
      console.warn(`[AI] Error in model ${modelName}:`, error.message);
    }
  }

  return {
    valor: parseAmountFromText(messageText),
    categoria: categorizeLocally(messageText),
    descricao: messageText.replace(/gastei|paguei|comprei/gi, '').trim(),
    data: new Date().toISOString().split('T')[0]
  };
}

async function transcribeAudio(buffer, mimetype) {
  try {
    console.log('[AUDIO] Transcribing audio via Groq (Whisper)...');
    
    const tempFilePath = path.join(__dirname, `..`, `..`, `temp_audio_${Date.now()}.ogg`);
    fs.writeFileSync(tempFilePath, buffer);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
      language: "pt",
      response_format: "text",
    });

    fs.unlinkSync(tempFilePath);

    console.log('[AUDIO] Transcription complete:', transcription);
    return transcription;
  } catch (error) {
    console.error('[AUDIO] Transcription error:', error.message);
    throw error;
  }
}

module.exports = {
  extractExpense,
  detectIntent,
  detectIntentLocally,
  parseAmountFromText,
  transcribeAudio
};
