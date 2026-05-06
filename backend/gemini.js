require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder');

// Log de depuração da chave (apenas início e fim por segurança)
const key = process.env.GEMINI_API_KEY || '';
console.log(`[SISTEMA] Iniciando Gemini com a chave: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);

const PROMPT_SISTEMA = `
Você é um assistente financeiro. Sua tarefa é extrair detalhes de gastos de uma mensagem (texto ou áudio).
Retorne APENAS um objeto JSON válido (sem markdown, sem \`\`\`json) com as seguintes chaves:
- "valor": o valor do gasto em formato numérico (ex: 35.50). Se não for identificado, retorne null.
- "categoria": uma categoria lógica (ex: "alimentação", "transporte", "lazer", "mercado", "moradia", "saúde", "outros").
- "descricao": uma breve descrição (ex: "almoço", "uber").
- "data": a data atual no formato "YYYY-MM-DD". Use hoje (${new Date().toISOString().split('T')[0]}).

Exemplo:
{
  "valor": 35.00,
  "categoria": "alimentação",
  "descricao": "almoço",
  "data": "2026-05-06"
}
`;

async function extrairGastos(textoMensagem) {
  const extrairViaRegex = (texto) => {
    const matchValor = texto.match(/(\d+([.,]\d+)?)/);
    if (matchValor) {
      const valor = parseFloat(matchValor[0].replace(',', '.'));
      return {
        valor: valor,
        categoria: "outros",
        descricao: texto.replace(/gastei/i, '').replace(matchValor[0], '').trim() || "Gasto via WhatsApp",
        data: new Date().toISOString().split('T')[0]
      };
    }
    return null;
  };

  const modelNames = [
    'gemini-1.5-flash', 
    'gemini-1.5-flash-latest', 
    'models/gemini-1.5-flash',
    'gemini-pro',
    'models/gemini-pro'
  ];
  let lastError = null;

  for (const modelName of modelNames) {
    try {
      console.log(`Tentando extrair gasto com o modelo: ${modelName} (API v1)`);
      const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });
      const prompt = `${PROMPT_SISTEMA}\n\nMensagem do usuário: "${textoMensagem}"`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      
      text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.warn(`Modelo ${modelName} falhou:`, error.message);
      lastError = error;
      continue;
    }
  }

  const resultadoRegex = extrairViaRegex(textoMensagem);
  if (resultadoRegex) return resultadoRegex;
  throw lastError || new Error('Falha ao extrair dados da mensagem');
}

async function extrairGastoDeAudio(audioBuffer, mimeType) {
  // Limpar mimetype
  const cleanMimeType = mimeType.split(';')[0];
  console.log(`🎙️ Processando áudio: ${cleanMimeType}`);

  const configs = [
    { model: 'gemini-1.5-flash-8b', apiVersion: 'v1beta' },
    { model: 'gemini-1.5-flash', apiVersion: 'v1beta' },
    { model: 'gemini-1.5-flash-latest', apiVersion: 'v1beta' },
    { model: 'gemini-1.5-pro-latest', apiVersion: 'v1beta' },
    { model: 'gemini-1.5-pro', apiVersion: 'v1beta' },
    { model: 'models/gemini-1.5-flash', apiVersion: 'v1beta' }
  ];
  
  let lastError = null;

  for (const config of configs) {
    try {
      console.log(`Tentando áudio: ${config.model} na ${config.apiVersion}...`);
      const model = genAI.getGenerativeModel({ model: config.model }, { apiVersion: config.apiVersion });

      const result = await model.generateContent([
        { text: PROMPT_SISTEMA },
        {
          inlineData: {
            data: audioBuffer.toString("base64"),
            mimeType: cleanMimeType
          }
        }
      ]);

      const response = await result.response;
      let text = response.text().trim();
      text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error(`Erro na config ${config.model}/${config.apiVersion}:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error("Falha total ao processar áudio no Gemini");
}

module.exports = { extrairGastos, extrairGastoDeAudio };
