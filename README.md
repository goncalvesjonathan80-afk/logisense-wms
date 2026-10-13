# 📦 LOGISENSE WMS — Sistema Integrado de Gerenciamento de Armazém

**Empresa fictícia:** LOGISENSE – Soluções Inteligentes em Logística (Campinas – SP)  
**Curso:** Tecnologia em Análise e Desenvolvimento de Sistemas — UNIP  
**Projeto Acadêmico:** Projeto Integrado Multidisciplinar III (PIM III)

---

## 🎯 Visão Geral do Projeto

O **LOGISENSE WMS** (*Warehouse Management System*) é uma plataforma web corporativa full-stack projetada para gerenciar as operações logísticas de um armazém de **1.500 m²** localizado em **Campinas – SP**. O sistema integra controle de catálogo e endereçamento físico, saldo em tempo real, recebimento e conferência cega (*Put-away*), gestão de pedidos, separação guiada (*Picking*), expedição (*Shipping*), telemetria ambiental simulada (*IoT*), relatórios gerenciais exportáveis em CSV e trilha de auditoria com controle de acesso baseado em papéis (**RBAC**) e diretrizes da **LGPD**.

---

## 🛠️ Arquitetura e Tecnologias

### Frontend (`/frontend`)
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (Design System Corporativo Industrial + Acessibilidade **WCAG 2.2 AA**)
- **React Router DOM v6** (Rotas protegidas por sessão JWT e perfil RBAC, sincronizadas em tempo real entre abas via `StorageEvent` e eventos de sessão)
- **Recharts** (Visualização analítica de movimentações e distribuição por categorias)
- **Lucide React** (Iconografia semântica)

### Backend (`/backend`)
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** conectado ao **SQLite Local** (`backend/prisma/dev.db`)
- **Autenticação & Segurança:**
  - **JWT (`jsonwebtoken`)** com expiração configurável
  - **Hash criptográfico (`bcryptjs`)** para senhas
  - **RBAC (*Role-Based Access Control*)** em todas as rotas da API
  - **Rate Limiting de Login** em memória contra ataques de força bruta (HTTP 429)
  - **CORS restrito** por lista explícita (*allowlist*) de origens locais
  - **Cabeçalhos HTTP defensivos** (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`) e limite de payload JSON (`256kb`)

---

## 👥 Perfis de Acesso (RBAC) e Credenciais de Demonstração

| Perfil | E-mail | Senha | Permissões no Sistema |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@logisense.com` | `admin123` | Acesso total ao sistema, catálogo, estoque, operações, relatórios e trilha de auditoria (`AuditLog`). |
| **GERENTE** | `gerente@logisense.com` | `gerente123` | Gestão de produtos/categorias, operações logísticas completas, cancelamento de recebimentos/pedidos e relatórios. |
| **OPERADOR** | `operador@logisense.com` | `operador123` | Execução operacional (entradas/saídas, recebimento, conferência, armazenagem, pedidos, picking, expedição, IoT e relatórios). |
| **CONSULTA** | `consulta@logisense.com` | `consulta123` | Visualização somente leitura de indicadores, catálogo, estoque, pedidos, monitoramento IoT e relatórios (bloqueado para alterações com HTTP 403). |

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v18+ ou v20+ recomendado)
- **npm**

---

### Cenário A — Execução no Computador Atual (com `dev.db` já existente)

Se o arquivo `backend/prisma/dev.db` já existe no projeto local, **não é necessário rodar seed ou resetar o banco**. Os dados já estão persistidos.

1. **Iniciar o Backend (Terminal 1):**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run dev
   ```
   O servidor iniciará em `http://localhost:3001` (Health Check em `http://localhost:3001/api/health`).

2. **Iniciar o Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Acesse no navegador: **`http://localhost:5173`**

---

### Cenário B — Inicialização em um Novo Computador (após clonar do GitHub)

Por segurança e boas práticas de versionamento, os arquivos `.env` e `dev.db` não são enviados ao GitHub. Ao clonar o repositório em um novo computador:

1. **Configurar e inicializar o Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run db:init
   npm run dev
   ```
   > **O que `npm run db:init` faz:** executa `prisma generate && prisma db push && tsx prisma/seed.ts`, criando automaticamente o arquivo `backend/prisma/dev.db` com todas as 10 tabelas do esquema e populando os 4 usuários RBAC, categorias, localizações, produtos, recebimentos, pedidos, movimentações e telemetria IoT.
   > **Trava de Segurança:** o script `prisma/seed.ts` verifica se já existem usuários no banco antes de rodar. Caso o banco já possua dados, o seed é ignorado automaticamente para evitar sobrescrita acidental.

2. **Configurar e inicializar o Frontend (em outro terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Acesse no navegador: **`http://localhost:5173`**

---

## 🧪 Scripts de Verificação e Testes Automatizados

O diretório `backend/` conta com suítes automatizadas de validação ponta a ponta:

- `node verify_fase4.js` — Valida o fluxo completo de Pedidos, Picking, Expedição, baixa transacional de estoque e RBAC (40 asserções).
- `node verify_fase5.js` — Valida Telemetria IoT simulada, geração/anti-duplicação/resolução de alertas, Dashboard e Relatórios/CSV (40 asserções).
- `node verify_fase6.js` — Valida Segurança JWT, RBAC (401/403), Health Check, validação de payloads, proteção contra vazamento de stack trace/SQL e conformidade LGPD no `AuditLog` (24 asserções).
- `node verify_session_and_security.js` — Valida os cenários de persistência de sessão, invalidação em múltiplas abas, bloqueio de acesso anônimo e matriz RBAC por módulo (25 asserções).

---

## 📂 Estrutura de Diretórios

```text
logisense-wms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                  # Modelagem de dados relacional (SQLite)
│   │   └── seed.ts                        # Inicialização segura para novos ambientes
│   ├── src/
│   │   ├── config/                        # Carregamento seguro de variáveis de ambiente
│   │   ├── controllers/                   # Regras de negócio, transações e validações
│   │   ├── database/                      # Instância singleton do Prisma Client
│   │   ├── middlewares/                   # Autenticação JWT e autorização RBAC
│   │   ├── routes/                        # Rotas REST organizadas por domínio
│   │   └── server.ts                      # Servidor Express, CORS allowlist e headers HTTP
│   ├── .env.example                       # Exemplo seguro de configuração local
│   ├── verify_fase4.js                    # Suíte automatizada Fase 4 (Pedidos/Picking/Expedição)
│   ├── verify_fase5.js                    # Suíte automatizada Fase 5 (IoT/Alertas/Relatórios)
│   ├── verify_fase6.js                    # Suíte automatizada Fase 6 (Segurança/AuditLog/LGPD)
│   └── verify_session_and_security.js     # Suíte automatizada de Sessão e RBAC
├── frontend/
│   ├── src/
│   │   ├── components/                    # Sidebar, Header, KPIs, Gráficos e Alertas
│   │   ├── contexts/                      # AuthContext com sincronização multi-abas e 401
│   │   ├── layouts/                       # MainLayout com Skip Link e suporte a teclado
│   │   ├── pages/                         # Páginas operacionais e gerenciais do WMS
│   │   ├── services/                      # Cliente HTTP centralizado (api.ts)
│   │   └── types/                         # Contratos TypeScript
├── README.md                              # Documentação técnica e guia de execução
└── RELATORIO_FINAL_LOGISENSE_FASE8.md     # Relatório técnico completo da Fase 8 (PIM III)
```

---

## 📄 Licença e Uso Acadêmico

Projeto desenvolvido exclusivamente para fins acadêmicos no **Projeto Integrado Multidisciplinar III (PIM III)** do curso de **Análise e Desenvolvimento de Sistemas — UNIP**.
