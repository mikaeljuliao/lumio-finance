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
const CATEGORY_OPTIONS = [...CATEGORIES_LIST];

const CATEGORY_DICTIONARY = {
  'investimentos': ['ação', 'ações', 'fundo', 'fii', 'investimento', 'investir', 'bolsa', 'crypto', 'bitcoin', 'tesouro', 'selic', 'cdb', 'aporte', 'carteira', 'renda variável', 'renda variavel'],
  'lazer': ['festa', 'balada', 'cinema', 'show', 'diversão', 'diversao', 'bar', 'cerveja', 'chope', 'chopp', 'rolê', 'role', 'game', 'playstation', 'steam', 'xbox', 'parque', 'teatro', 'ingresso', 'festival', 'piscina'],
  'viagem': ['avião', 'aviao', 'hotel', 'airbnb', 'passagem', 'viagem', 'viajar', 'hospedagem', 'turismo', 'mala', 'albergue', 'hostel', 'trekking', 'turista'],
  'educação': ['curso', 'faculdade', 'escola', 'aula', 'estudo', 'livro', 'mensalidade', 'udemy', 'alura', 'programação', 'programacao', 'dev', 'bootcamp', 'material escolar', 'uniforme', 'mensalidade escolar'],
  'serviços': ['luz', 'água', 'agua', 'gas', 'gás', 'energia', 'internet', 'wifi', 'assinatura', 'netflix', 'spotify', 'prime', 'mensalidade', 'celular', 'plano', 'streaming', 'adobe', 'dropbox', 'conta', 'contas'],
  'moradia': ['aluguel', 'condomínio', 'condominio', 'iptu', 'reforma', 'móvel', 'moveis', 'casa', 'apartamento', 'quarto', 'manutenção', 'manutencao', 'conserto', 'obras', 'reparo', 'pintura'],
  'alimentação': ['comida', 'lanche', 'salgado', 'pizza', 'ifood', 'rappi', 'restaurante', 'marmita', 'padaria', 'café', 'cafe', 'almoço', 'almoco', 'jantar', 'churrasco', 'hamburguer', 'burger', 'sorvete', 'cafeteria', 'doceria', 'sushi', 'delivery', 'kebab'],
  'transporte': ['uber', '99', 'taxi', 'táxi', 'gasolina', 'combustível', 'combustivel', 'onibus', 'ônibus', 'metrô', 'metro', 'pedágio', 'pedagio', 'estacionamento', 'vale transporte', 'bilhete', 'carona'],
  'saúde': ['remédio', 'remedio', 'farmácia', 'farmacia', 'médico', 'medico', 'dentista', 'hospital', 'exame', 'academia', 'suplemento', 'whey', 'psicólogo', 'psicologo', 'consulta', 'fisioterapia', 'nutricionista', 'terapia', 'clinica', 'medicação', 'medicacao'],
  'mercado': ['mercado', 'supermercado', 'compras do mês', 'compras do mes', 'atacadão', 'atacadao', 'feira', 'sacolão', 'sacolao', 'hortifruti', 'frutas', 'verduras', 'ovos', 'leite', 'arroz', 'carnes', 'mercearia', 'horta'],
  'compras': ['roupa', 'sapato', 'tênis', 'tenis', 'shopping', 'celular', 'fone', 'eletrônico', 'eletronico', 'ferramenta', 'presente', 'perfume', 'camera', 'notebook', 'mochila', 'acessorio', 'acessórios', 'relógio', 'relogio', 'pulseira'],
  'presentes': ['presente', 'mimo', 'doação', 'doacao', 'lembrancinha', 'aniversário', 'aniversario', 'natal', 'casamento', 'dia dos pais', 'dia das maes', 'namorado', 'noiva', 'convite']
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
  const raw = String(text || '').trim();
  if (!raw) return null;

  const dateLikePattern = /(^|[\s(])\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?(?=$|[\s),.;!?])/gi;
  const candidateText = raw.replace(dateLikePattern, ' ');

  if (!candidateText || /^\s*$/.test(candidateText)) return null;

  const match = candidateText.match(/(?:r\$\s*)?((?:\d{1,3}(?:\.\d{3})+|\d+)(?:[.,]\d{1,2})?)/i);
  if (!match) return null;

  let amount = match[1].replace(/\s/g, '');
  if (amount.includes(',')) {
    amount = amount.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(amount)) {
    amount = amount.replace(/\./g, '');
  }

  const parsed = Number(amount);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatDateForInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateFromText(text) {
  const value = String(text || '').toLowerCase();

  if (/hoje|hje|today/.test(value)) return formatDateForInput(new Date());
  if (/amanh|tomorrow/.test(value)) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return formatDateForInput(tomorrow);
  }

  const isoMatch = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const slashMatch = value.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
  if (slashMatch) {
    const [, day, month, yearPart] = slashMatch;
    const year = yearPart ? (yearPart.length === 2 ? `20${yearPart}` : yearPart) : new Date().getFullYear();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return formatDateForInput(new Date());
}

function hasExplicitDatePattern(text) {
  return /(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|hoje|amanh|hje|tomorrow)/i.test(String(text || ''));
}

function parseExpenseFollowUp(text) {
  const valueText = String(text || '');
  const explicitDateOnly = hasExplicitDatePattern(valueText) && !/[rR]\$?\s*\d/.test(valueText) && !/\d[\d. ]*(?:,\d{1,2})?/.test(valueText.replace(/\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?/gi, ''));

  if (explicitDateOnly) {
    return {
      valor: null,
      data: parseDateFromText(valueText),
    };
  }

  const amount = parseAmountFromText(text);
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return null;

  return {
    valor: Number(amount),
    data: parseDateFromText(text),
  };
}

function normalizeCategoryChoice(text) {
  const normalized = normalizeText(text || '');
  if (!normalized) return 'outros';

  const numericMatch = normalized.match(/^\d+$/);
  if (numericMatch) {
    const index = Number(numericMatch[0]) - 1;
    if (index >= 0 && index < CATEGORY_OPTIONS.length) {
      return CATEGORY_OPTIONS[index];
    }
  }

  const numberedChoice = normalized.match(/^(\d+)\s+(.+)$/);
  if (numberedChoice) {
    const selectedIndex = Number(numberedChoice[1]) - 1;
    if (selectedIndex >= 0 && selectedIndex < CATEGORY_OPTIONS.length) {
      return CATEGORY_OPTIONS[selectedIndex];
    }
  }

  const healthPriorityKeywords = ['ortodontico', 'ortodôntico', 'aparelho', 'aparelhos', 'molar', 'dente', 'dentista', 'farmacia', 'farmácia', 'remedio', 'remédio', 'academia', 'suplemento', 'fisioterapia', 'psicologo', 'psicólogo', 'terapia', 'nutricionista', 'clinica', 'cabelo', 'corte de cabelo', 'cabeleireiro', 'cabelereiro', 'salao', 'salão', 'estetica', 'estética', 'maquiagem', 'depilacao', 'depilação', 'barbearia', 'barbeiro'];

  for (const keyword of healthPriorityKeywords) {
    if (normalized.includes(normalizeText(keyword))) return 'saúde';
  }

  const categoryMap = [
    ['alimentacao', 'alimentação'],
    ['saude', 'saúde'],
    ['educacao', 'educação'],
    ['servicos', 'serviços'],
    ['moradia', 'moradia'],
    ['mercado', 'mercado'],
    ['lazer', 'lazer'],
    ['transporte', 'transporte'],
    ['compras', 'compras'],
    ['presentes', 'presentes'],
    ['viagem', 'viagem'],
    ['investimentos', 'investimentos'],
    ['outros', 'outros'],
    ['farmacia', 'saúde'],
    ['academia', 'saúde'],
    ['restaurante', 'alimentação'],
    ['padaria', 'alimentação'],
    ['cafe', 'alimentação'],
    ['mercadinho', 'mercado'],
    ['hortifruti', 'mercado'],
    ['feira', 'mercado'],
    ['presente', 'presentes'],
    ['aniversario', 'presentes'],
    ['natal', 'presentes'],
    ['cinema', 'lazer'],
    ['show', 'lazer'],
    ['bar', 'lazer'],
    ['uber', 'transporte'],
    ['onibus', 'transporte'],
    ['combustivel', 'transporte'],
    ['gasolina', 'transporte'],
    ['luz', 'serviços'],
    ['agua', 'serviços'],
    ['internet', 'serviços'],
    ['plano', 'serviços'],
    ['aluguel', 'moradia'],
    ['condominio', 'moradia'],
    ['iptu', 'moradia']
  ];

  for (const [alias, category] of categoryMap) {
    if (normalized.includes(alias)) return category;
  }

  const categoryKeywords = {
    alimentação: ['almoco', 'almoço', 'lanche', 'comida', 'restaurante', 'padaria', 'pizza', 'cafe', 'café', 'coffee', 'marmita', 'jantar', 'churrasco', 'hamburguer', 'sorvete', 'delivery', 'cafezinho', 'sushi', 'kebab'],
    transporte: ['uber', 'taxi', 'onibus', 'ônibus', 'bus', 'gasolina', 'combustivel', 'estacionamento', 'pedagio', 'vale transporte', 'carona', 'metrô', 'metro'],
    lazer: ['cinema', 'show', 'bar', 'cerveja', 'chopp', 'rolê', 'role', 'game', 'playstation', 'steam', 'xbox', 'parque', 'teatro', 'festival', 'ingresso'],
    saúde: ['remedio', 'remédio', 'farmacia', 'farmácia', 'dentista', 'medico', 'médico', 'consulta', 'exame', 'academia', 'suplemento', 'whey', 'psicologo', 'psicólogo', 'fisioterapia', 'nutricionista', 'terapia', 'clinica', 'ortodontico', 'ortodôntico', 'aparelho', 'aparelhos', 'cabelo', 'corte de cabelo', 'cabeleireiro', 'cabelereiro', 'salao', 'salão', 'estetica', 'estética', 'maquiagem', 'depilacao', 'depilação', 'barbearia', 'barbeiro'],
    moradia: ['aluguel', 'condominio', 'iptu', 'casa', 'apartamento', 'reforma', 'manutencao', 'reparo', 'conserto', 'pintura'],
    mercado: ['mercado', 'supermercado', 'feira', 'sacolao', 'atacadao', 'hortifruti', 'frutas', 'verduras', 'ovos', 'leite', 'arroz', 'carne', 'mercearia', 'merceario'],
    educação: ['curso', 'faculdade', 'escola', 'aula', 'livro', 'udemy', 'alura', 'bootcamp', 'material escolar'],
    serviços: ['internet', 'luz', 'agua', 'gás', 'gas', 'energia', 'wifi', 'netflix', 'spotify', 'plano', 'celular', 'assinatura', 'streaming'],
    compras: ['roupa', 'sapato', 'tenis', 'shopping', 'celular', 'fone', 'eletronico', 'ferramenta', 'perfume', 'notebook', 'mochila', 'relogio', 'pulseira'],
    presentes: ['presente', 'mimo', 'lembrancinha', 'aniversario', 'natal', 'casamento', 'dia dos pais', 'dia das maes'],
    viagem: ['passagem', 'hotel', 'airbnb', 'viagem', 'viajar', 'turismo', 'aviao', 'hospedagem', 'mala', 'albergue'],
    investimentos: ['acao', 'fii', 'investimento', 'bitcoin', 'cripto', 'tesouro', 'selic', 'aporte', 'carteira'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matchedKeyword = keywords.find(keyword => normalized.includes(normalizeText(keyword)));
    if (matchedKeyword) return category;
  }

  return 'outros';
}

function isSimpleGreeting(text) {
  const normalized = normalizeText(text).replace(/[!?.,]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(oi|ola|opa|eai|e ae|bom dia|boa tarde|boa noite|tudo bem|obrigado|obrigada|valeu)(\s+(lumio|bot|kkk|haha))*$/.test(normalized);
}

function detectMultipleActionIntent(normalized) {
  const actions = [];

  const hasLimitQuery = (
    ((/\b(quais|ver|consultar|mostrar|liste|listar)\b/.test(normalized)) && /\blimites?\b/.test(normalized)) ||
    normalized.includes('quanto posso gastar')
  );

  const hasLimitDefinition = /\blimite\b|\bmaximo\b|\bmaxima\b/.test(normalized);
  const hasExpenseCue = /\b(gastei|paguei|comprei|custou|anota|registrar|registra|despesa|gasto)\b/.test(normalized);
  const amount = parseAmountFromText(normalized);
  const hasKnownCategory = categorizeLocally(normalized) !== 'outros';

  if (hasExpenseCue || (amount !== null && hasKnownCategory)) {
    actions.push('REGISTRAR_GASTO');
  }

  if (hasLimitQuery || hasLimitDefinition) {
    actions.push('VER_LIMITES');
  }

  if (actions.length > 1) {
    return { intencao: 'MULTIPLE_ACTIONS', actions: actions.filter((action, index, list) => list.indexOf(action) === index) };
  }

  return null;
}

function detectIntentLocally(text) {
  const normalized = normalizeText(text);
  if (isSimpleGreeting(normalized)) return { intencao: 'NAO_ENTENDIDA' };

  const multiActionIntent = detectMultipleActionIntent(normalized);
  if (multiActionIntent) {
    return multiActionIntent;
  }

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
4. "MULTIPLE_ACTIONS": Quando a mensagem combina duas ações em uma só frase, como "gastei 50 no mercado e quero ver meus limites".
5. "NAO_ENTENDIDA": Saudações, mensagens sem relação com as funções disponíveis ou pedidos que você não consegue atender.

CONTEXTOS IMPORTANTES DE CATEGORIA:
- Alimentação: almoço, café, restaurante, marmita, padaria, churrasco, sushi, delivery, lanche, pizza
- Saúde: academia, farmácia, remédio, dentista, consulta, exame, suplemento, fisioterapia
- Mercado: mercado, supermercado, feira, hortifruti, sacolão, ovos, leite, arroz, frutas
- Transporte: uber, gasolina, ônibus, estacionamento, pedágio, taxi
- Lazer: cinema, show, bar, cerveja, jogo, playstation, xbox
- Presentes: presente, aniversário, natal, casamento, lembrancinha
- Serviços: luz, água, internet, netflix, spotify, plano, celular
- Moradia: aluguel, condomínio, IPTU, reforma, manutenção

Use esses sinais como contexto para decidir a categoria. Só pergunte categoria quando a mensagem não tiver contexto suficiente para decidir com segurança.

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
    const supportedIntents = ['REGISTRAR_GASTO', 'DEFINIR_LIMITE', 'VER_LIMITES', 'MULTIPLE_ACTIONS', 'NAO_ENTENDIDA'];
    if (supportedIntents.includes(parsed.intencao)) {
      if (parsed.intencao === 'MULTIPLE_ACTIONS') {
        return { ...parsed, actions: Array.isArray(parsed.actions) ? parsed.actions : [] };
      }
      return parsed;
    }

    return detectIntentLocally(text);
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
- "alimentação": almoço, café, restaurante, marmita, padaria, churrasco, delivery, lanche, pizza.
- "saúde": academia, farmácia, remédio, dentista, consulta, exame, suplemento, fisioterapia.
- "mercado": mercado, supermercado, feira, hortifruti, ovos, frutas, leite, arroz.
- "presentes": presente, aniversário, natal, casamento, lembrancinha.

Se o contexto for forte, use a categoria correta sem perguntar. Só peça categoria quando a frase for ambígua demais.

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
  parseDateFromText,
  parseExpenseFollowUp,
  normalizeCategoryChoice,
  CATEGORY_OPTIONS,
  transcribeAudio
};
