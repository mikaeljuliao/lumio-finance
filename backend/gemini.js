require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder');

const key = process.env.GEMINI_API_KEY || '';
console.log(`[SISTEMA] Iniciando Gemini com a chave: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);

const CATEGORIAS_LISTA = ['alimentação', 'transporte', 'saúde', 'mercado', 'moradia', 'educação', 'assinaturas', 'lazer', 'compras', 'presentes', 'outros', 'geral'];

const DICIONARIO_CATEGORIAS = {
  'educação': ['curso', 'faculdade', 'escola', 'aula', 'estudo', 'livro', 'mensalidade', 'udemy', 'alura', 'rocketseat', 'dev', 'fullstack', 'programação'],
  'lazer': ['festa', 'balada', 'cinema', 'viagem', 'show', 'diversão', 'diversao', 'passeio', 'praia', 'hotel', 'airbnb', 'bar', 'cerveja', 'pub'],
  'compras': ['roupa', 'tenis', 'tênis', 'sapato', 'camiseta', 'calça', 'shopping', 'eletrônico', 'celular', 'fone', 'headset', 'acessório'],
  'presentes': ['presente', 'mimo', 'doação', 'lembrancinha', 'aniversário'],
  'alimentação': ['comida', 'lanche', 'salgado', 'pizza', 'rodízio', 'rodizio', 'ifood', 'rappi', 'marmita', 'café', 'padaria'],
  'transporte': ['uber', '99', 'taxi', 'táxi', 'gasolina', 'combustível', 'onibus', 'ônibus', 'passagem', 'metrô'],
  'saúde': ['remédio', 'remedio', 'farmácia', 'farmacia', 'médico', 'medico', 'consulta', 'exame', 'dentista', 'academia', 'suplemento', 'whey'],
  'mercado': ['mercado', 'supermercado', 'atacado', 'atacadão', 'compras do mês', 'sacolão'],
  'moradia': ['aluguel', 'condomínio', 'condominio', 'conta de luz', 'energia', 'internet', 'wifi', 'água', 'iptu', 'reforma'],
  'assinaturas': ['netflix', 'spotify', 'prime', 'icloud', 'google one', 'chatgpt', 'openai', 'mensalidade']
};

function categorizarLocalmente(texto) {
  const t = texto.toLowerCase();
  for (const [cat, palavras] of Object.entries(DICIONARIO_CATEGORIAS)) {
    if (palavras.some(p => t.includes(p))) return cat;
  }
  return 'outros';
}

const PROMPT_INTENCAO = `
Você é um cérebro financeiro. Analise a mensagem do usuário e identifique a intenção.
Responda APENAS com um JSON.

INTENÇÕES:
1. "REGISTRAR_GASTO": O usuário está informando que gastou dinheiro (ex: "gastei 50 no bar").
2. "DEFINIR_LIMITE": O usuário quer estabelecer um teto de gastos (ex: "quero gastar no máximo 500 em lazer", "meu limite de mercado é 1000", "limite mensal 2000").
3. "VER_LIMITES": O usuário quer saber seus limites ou quanto gastou (ex: "quais meus limites?", "quanto já gastei?").
4. "OUTRO": Nenhuma das anteriores.

Categorias válidas: ${CATEGORIAS_LISTA.join(', ')}. "geral" é para o limite total do mês.

Exemplo retorno DEFINIR_LIMITE:
{"intencao": "DEFINIR_LIMITE", "valor": 500, "categoria": "lazer"}

Exemplo retorno REGISTRAR_GASTO:
{"intencao": "REGISTRAR_GASTO"}
`;

async function detectarIntencao(texto) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(`${PROMPT_INTENCAO}\n\nMensagem: "${texto}"`);
    const response = await result.response;
    let text = response.text().trim();
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    // Fallback simples por Regex se a IA falhar
    if (texto.toLowerCase().includes('limite') || texto.toLowerCase().includes('máximo') || texto.toLowerCase().includes('maximo')) {
      const valor = texto.match(/(\d+(?:[.,]\d+)?)/);
      const cat = categorizarLocalmente(texto);
      return { intencao: 'DEFINIR_LIMITE', valor: valor ? parseFloat(valor[0].replace(',', '.')) : null, categoria: texto.toLowerCase().includes('mensal') || texto.toLowerCase().includes('geral') ? 'geral' : cat };
    }
    return { intencao: 'REGISTRAR_GASTO' };
  }
}

const PROMPT_SISTEMA_GASTO = `
Você é um assistente financeiro de elite. Extraia os dados do gasto.
CATEGORIAS: ${CATEGORIAS_LISTA.join(', ')}.

REGRAS:
- "moradia" é só para ALUGUEL, LUZ, ÁGUA, INTERNET.
- "compras" é para ROUPAS, OBJETOS, ELETRÔNICOS.
- "lazer" é para DIVERSÃO, VIAGEM, CINEMA, BAR.

Retorne JSON: {"valor": num, "categoria": "string", "descricao": "string", "data": "YYYY-MM-DD"}
`;

async function extrairGastos(textoMensagem) {
  const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `${PROMPT_SISTEMA_GASTO}\n\nMensagem: "${textoMensagem}"`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      
      const categoriaForçada = categorizarLocalmente(textoMensagem);
      if (categoriaForçada !== 'outros' && (parsed.categoria === 'moradia' || parsed.categoria === 'outros')) {
        parsed.categoria = categoriaForçada;
      }
      if (parsed.valor) parsed.valor = Number(parsed.valor);
      return parsed;
    } catch (error) {
      console.warn(`Erro no modelo ${modelName}:`, error.message);
    }
  }
  const matchValor = textoMensagem.match(/(\d+(?:[.,]\d+)?)/);
  return {
    valor: matchValor ? parseFloat(matchValor[0].replace(',', '.')) : null,
    categoria: categorizarLocalmente(textoMensagem),
    descricao: textoMensagem.replace(/gastei|paguei|comprei/gi, '').trim(),
    data: new Date().toISOString().split('T')[0]
  };
}

async function extrairGastoDeAudio(audioBuffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  try {
    const result = await model.generateContent([
      { text: PROMPT_SISTEMA_GASTO },
      { inlineData: { data: audioBuffer.toString('base64'), mimeType: mimeType.split(';')[0] } }
    ]);
    const response = await result.response;
    let text = response.text().trim();
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    if (parsed.valor) parsed.valor = Number(parsed.valor);
    return parsed;
  } catch (error) {
    throw error;
  }
}

module.exports = { extrairGastos, extrairGastoDeAudio, detectarIntencao };
