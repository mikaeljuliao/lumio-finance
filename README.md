# Lumio Finance 💸🤖

**Lumio Finance** é um assistente financeiro pessoal em formato de MVP (Minimum Viable Product). Ele permite o registro e acompanhamento de despesas através de conversas naturais no WhatsApp, integrando inteligência artificial e um painel web atualizado em tempo real.

O fluxo principal do sistema opera da seguinte forma:
`WhatsApp` ➡️ `Baileys` ➡️ `Processamento (Groq Whisper + Gemini)` ➡️ `PostgreSQL` ➡️ `Socket.IO` ➡️ `Dashboard Web`

## 🎯 O Problema que Resolve
O rastreamento manual de despesas pode ser tedioso. O Lumio remove essa fricção ao permitir que os registros sejam feitos por texto ou áudio no aplicativo que o usuário já utiliza (WhatsApp), estruturando os dados de forma automática via IA.

## ⚙️ Funcionalidades Implementadas (Estado Atual)

O projeto é um assistente de uso pessoal (single-user) com os seguintes recursos operacionais:

- **Integração com WhatsApp:** Utiliza a biblioteca `@whiskeysockets/baileys` para integração com o WhatsApp Web. A conexão é feita escaneando um QR Code exibido diretamente no Dashboard Web.
- **Entrada via Áudio ou Texto:** Suporta mensagens de texto e áudio. Os áudios são transcritos utilizando a API da **Groq (modelo Whisper-large-v3)**.
- **Processamento com IA:** O **Google Gemini** processa a transcrição ou o texto para identificar três intenções específicas:
  - `REGISTRAR_GASTO`: Extrai do texto livre o `valor`, `categoria`, `descricao` e `data` da despesa.
  - `DEFINIR_LIMITE`: Estabelece um teto de gastos mensal para uma categoria específica.
  - `VER_LIMITES`: Consulta os limites mensais configurados.
- **Gestão de Limites e Alertas:** O sistema realiza verificações e notifica o usuário proativamente no WhatsApp sobre o status dos seus gastos em relação aos limites mensais configurados por categoria.
- **Dashboard Web em Tempo Real:** Uma interface construída em Next.js que se conecta ao backend via **Socket.IO**. Quando um novo gasto é registrado via WhatsApp, o painel recebe um evento `novo_gasto` e atualiza as estatísticas instantaneamente.

## 🚀 Stack Tecnológica

**Backend:**
- Node.js & Express
- Prisma ORM & PostgreSQL (Neon)
- `@whiskeysockets/baileys` (Integração WhatsApp Web)
- `groq-sdk` (Transcrição de áudio via Whisper)
- `@google/generative-ai` (Integração Google Gemini)
- `socket.io` (Comunicação em tempo real)

**Frontend:**
- Next.js (16.2.4) com App Router
- React (19.2.4)
- Tailwind CSS (v4)
- Recharts (Gráficos)
- `socket.io-client`

## 📂 Estrutura de Pastas Relevante

```text
lumio-finance/
├── backend/
│   ├── prisma/
│   │   ├── migrations/      # Histórico de migrações do banco de dados
│   │   └── schema.prisma    # Modelagem (Tabelas: Gasto, Limite)
│   ├── auth_info_baileys/   # Contém as credenciais da sessão do WhatsApp (não deve ser versionado)
│   ├── index.js             # Entry point, servidor Express, Socket.IO e fluxos do WhatsApp
│   ├── transcrever.js       # Lógica de transcrição de áudio utilizando Groq
│   ├── gemini.js            # Integração com Google Gemini
│   ├── gastos.js            # Consultas e inserções de gastos no banco
│   └── limites.js           # Consultas e verificações de orçamentos no banco
└── frontend/
    └── src/
        ├── app/             # Rotas e layout principal do Next.js
        ├── components/      # Componentes visuais
        ├── hooks/           # Hooks customizados do React
        ├── lib/             # Funções utilitárias
        └── services/        # Lógica de chamadas de API
```

## 🛠️ Como executar o projeto localmente

### Pré-requisitos
- Node.js em versão compatível com as dependências do projeto
- Banco de dados PostgreSQL (local ou em nuvem, como Neon)

### 1. Backend
Navegue até a pasta do servidor e instale as dependências:
```bash
cd backend
npm install
```
Crie um arquivo `.env` na raiz da pasta `backend` com as variáveis exigidas. Em seguida, rode as migrations para estruturar o banco:
```bash
npx prisma migrate dev
```
Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

### 2. Frontend
Em outro terminal, navegue até a pasta do cliente e instale as dependências:
```bash
cd frontend
npm install
```
Se necessário, configure variáveis locais num arquivo `.env.local`. Depois rode a interface:
```bash
npm run dev
```
Acesse `http://localhost:3000` no navegador. O QR Code para parear o WhatsApp será exibido na tela inicial do dashboard.

## 🔐 Variáveis de Ambiente Necessárias
*(Não utilize aspas ou chaves reais ao configurar)*

**Backend (`backend/.env`):**
```env
PORT=3001
DATABASE_URL=
GEMINI_API_KEY=
GROQ_API_KEY=
```
