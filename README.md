# Lumio

**Lumio** é um aplicativo de controle financeiro pessoal que permite registrar e acompanhar gastos de forma simples — tanto pelo dashboard web quanto pelo WhatsApp.

O usuário pode enviar mensagens de texto ou áudio para o número do Lumio no WhatsApp. O sistema transcreve os áudios, interpreta as mensagens com IA e registra as transações automaticamente. O dashboard é atualizado em tempo real via WebSocket.

```
Usuário (Dashboard ou WhatsApp)
  → Backend (Express)
    → IA (Gemini + Groq Whisper, quando necessário)
      → PostgreSQL
        → Dashboard (atualização via Socket.IO)
```

---

## Funcionalidades

- **Autenticação por WhatsApp** — login vinculado ao número do usuário, com sessão persistente por token
- **Dashboard financeiro** — resumo mensal com totais de gastos e saldo
- **Registro manual de gastos** — formulário no dashboard com valor, categoria, descrição e data
- **Categorização** — cada transação possui categoria (alimentação, transporte, lazer, etc.)
- **Limites por categoria** — define e monitora orçamentos mensais por categoria; alertas enviados pelo WhatsApp quando o limite é atingido
- **Visualização de dados** — gráficos de evolução mensal e distribuição por categoria
- **Histórico de transações** — extrato com edição e exclusão individual ou total do mês
- **Atualização em tempo real** — novos gastos registrados via WhatsApp aparecem instantaneamente no dashboard (Socket.IO)
- **Integração com WhatsApp** — o usuário envia mensagens para o número central do Lumio
  - **Texto** — "gastei 50 reais no mercado" → Gemini interpreta e registra
  - **Áudio** — Groq Whisper transcreve, depois Gemini interpreta
  - **Consulta de limites** — "ver limites" retorna os orçamentos configurados
  - **Definir limite** — "limite de alimentação 500 reais" configura o teto da categoria

---

## Arquitetura

O Lumio utiliza uma arquitetura de **monólito modular** com frontend, backend e banco separados por responsabilidade.

### Frontend
- **Next.js 16** (App Router) + **React 19**
- Interface responsiva com Tailwind CSS v4
- Gráficos com Recharts
- Comunicação com backend via `fetch` autenticado e `socket.io-client`

### Backend
- **Node.js** + **Express 5**
- **Prisma ORM** com PostgreSQL (Neon)
- **Baileys** para integração com WhatsApp Web
- **Google Gemini** para interpretação de intenções e extração de dados
- **Groq (Whisper-large-v3)** para transcrição de áudios
- **Socket.IO** para push de eventos em tempo real ao frontend

### Banco de dados
- **PostgreSQL** hospedado na [Neon](https://neon.tech)

---

## Estrutura do projeto

```
lumio-finance/
├── backend/
│   ├── prisma/
│   │   └── migrations/
│   └── src/
│       ├── api/
│       ├── services/
│       └── whatsapp/
└── frontend/
    └── src/
        ├── app/
        ├── components/
        ├── hooks/           
        └── lib/               
```

---

## Como executar localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL (local ou via [Neon](https://neon.tech))

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/lumio-finance.git
cd lumio-finance
```

### 2. Configure e inicie o backend

```bash
cd backend
npm install
```

Crie o arquivo `backend/.env`:

```env
PORT=3001
DATABASE_URL=
GEMINI_API_KEY=
GROQ_API_KEY=
FRONTEND_URL=http://localhost:3000
```

Execute as migrations do Prisma:

```bash
npx prisma migrate deploy
```

Inicie o servidor:

```bash
npm run dev
```

O backend ficará disponível em `http://localhost:3001`.

### 3. Configure e inicie o frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Crie o arquivo `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Inicie a interface:

```bash
npm run dev
```

Acesse `http://localhost:3000`.

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor Express (padrão: 3001) |
| `DATABASE_URL` | Connection string do PostgreSQL |
| `GEMINI_API_KEY` | Chave da API do Google Gemini |
| `GROQ_API_KEY` | Chave da API da Groq (transcrição de áudio) |
| `FRONTEND_URL` | URL do frontend para configuração de CORS |

### Frontend (`frontend/.env.local`)

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base do backend |

---

## WhatsApp

O Lumio utiliza um **número central próprio**. O usuário não conecta o próprio WhatsApp — ele simplesmente envia mensagens para o número do Lumio.

A integração usa [Baileys](https://github.com/WhiskeySockets/Baileys), que conecta via WhatsApp Web. 

**Intenções suportadas pelo Gemini:**

| Comando | Exemplo |
|---|---|
| Registrar gasto | "gastei 80 reais no almoço" |
| Definir limite | "limite de transporte 300 reais" |
| Consultar limites | "ver limites" |
