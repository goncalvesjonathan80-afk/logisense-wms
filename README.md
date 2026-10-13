# 📦 LOGISENSE WMS — Sistema Integrado de Gerenciamento de Armazém

**Empresa fictícia:** LOGISENSE – Soluções Inteligentes em Logística (Campinas – SP)  
**Curso:** Tecnologia em Análise e Desenvolvimento de Sistemas — UNIP  
**Projeto Acadêmico:** Projeto Integrado Multidisciplinar III (PIM III)

---

## 🎯 Visão Geral do Projeto

O **LOGISENSE WMS** (*Warehouse Management System*) é uma plataforma web corporativa full-stack projetada para gerenciar as operações logísticas de um armazém de **1.500 m²** localizado em **Campinas – SP**. O sistema integra controle de catálogo e endereçamento físico, saldo em tempo real, recebimento e conferência cega (*Put-away*), gestão de pedidos, separação guiada (*Picking*), expedição (*Shipping*), telemetria ambiental simulada (*IoT*), relatórios gerenciais exportáveis em CSV e trilha de auditoria com controle de acesso baseado em papéis (**RBAC**) e boas práticas alinhadas à **LGPD**.

---

## 🛠️ Arquitetura e Tecnologias

### Frontend (`/frontend`)
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (Design System Corporativo Industrial com melhorias práticas de acessibilidade inspiradas na **WCAG 2.2 AA**: *Skip Link*, foco visível `:focus-visible`, suporte à tecla `Escape`, semântica ARIA em modais/tabelas/abas e suporte a `prefers-reduced-motion`)
- **React Router DOM v6** (Rotas protegidas por sessão JWT e perfil RBAC, sincronizadas entre abas via `StorageEvent` e na mesma aba via evento `logisense:unauthorized`)
- **Recharts** (Visualização analítica de movimentações e distribuição por categorias)
- **Lucide React** (Iconografia semântica)

### Backend (`/backend`)
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** conectado ao **SQLite Local** (`backend/prisma/dev.db`) com **12 modelos / 12 tabelas de negócio**
- **Autenticação & Segurança Local:**
  - **Bind local seguro (`127.0.0.1`):** por padrão, o servidor escuta exclusivamente em loopback (`HOST=127.0.0.1`, porta `3001`), evitando exposição acidental na rede local/Wi-Fi
  - **JWT (`jsonwebtoken`):** validação de configuração do `JWT_SECRET` na inicialização e script `npm run env:init` para geração de segredo criptograficamente aleatório sem sobrescrever `.env` existente
  - **Hash criptográfico (`bcryptjs`)** para senhas
  - **RBAC (*Role-Based Access Control*)** em todas as rotas da API
  - **Rate Limiting de Login** em memória contra ataques de força bruta (HTTP 429 após 10 falhas na janela de 15 minutos)
  - **CORS restrito** por lista explícita (*allowlist*) de origens locais (`http://localhost:5173`, `http://127.0.0.1:5173`)
  - **Cabeçalhos HTTP defensivos** (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`) e limite de payload JSON (`256kb`)

---

## 🗄️ Modelagem de Dados (12 Modelos Prisma / 12 Tabelas SQLite)

O schema relacional definido em `backend/prisma/schema.prisma` possui **12 modelos** mapeados para **12 tabelas de negócio** no SQLite (`0` tabelas internas extras):

| # | Modelo Prisma | Tabela SQLite (`@@map`) | Finalidade no WMS | Registros no `dev.db` |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `User` | `users` | Usuários do sistema e perfis RBAC (`ADMIN`, `GERENTE`, `OPERADOR`, `CONSULTA`) | 4 |
| 2 | `Category` | `categories` | Categorias logísticas de materiais e produtos | 4 |
| 3 | `Location` | `locations` | Endereçamento físico do armazém (Corredor, Estante, Posição) | 8 |
| 4 | `Product` | `products` | Catálogo de produtos (SKU, estoque mínimo, saldo atual e endereço) | 9 |
| 5 | `StockMovement` | `stock_movements` | Histórico de movimentações de estoque (`ENTRY`, `EXIT`, `ADJUSTMENT`, `TRANSFER`) | 28 |
| 6 | `Order` | `orders` | Cabeçalho de pedidos de saída (`PENDING`, `PICKING`, `PICKED`, `SHIPPED`, `CANCELLED`) | 53 |
| 7 | `OrderItem` | `order_items` | Itens de cada pedido (quantidades solicitadas e separadas no *picking*) | 68 |
| 8 | `Receiving` | `receivings` | Ordens de recebimento de fornecedores (`PENDING`, `CHECKING`, `CHECKED`, `STORED`, `CANCELLED`) | 1 |
| 9 | `ReceivingItem` | `receiving_items` | Itens das ordens de recebimento (quantidades esperadas e conferidas) | 2 |
| 10 | `AuditLog` | `audit_logs` | Trilha imutável de auditoria operacional e de segurança | 375 |
| 11 | `IoTReading` | `iot_readings` | Leituras de telemetria ambiental simulada por área (Temperatura e Umidade) | 86 |
| 12 | `Alert` | `alerts` | Alertas operacionais de estoque mínimo e excursão térmica/umidade IoT | 28 |

---

## 👥 Perfis de Acesso (RBAC) e Credenciais de Demonstração

| Perfil | E-mail | Senha | Permissões no Sistema |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@logisense.com` | `admin123` | Acesso total ao sistema, catálogo, estoque, operações, usuários, relatórios e trilha de auditoria (`AuditLog`). |
| **GERENTE** | `gerente@logisense.com` | `gerente123` | Gestão de produtos/categorias, consulta de usuários, operações logísticas completas, cancelamento de recebimentos/pedidos e relatórios. |
| **OPERADOR** | `operador@logisense.com` | `operador123` | Execução operacional (entradas/saídas, recebimento, conferência, armazenagem, pedidos, picking, expedição, IoT e relatórios). |
| **CONSULTA** | `consulta@logisense.com` | `consulta123` | Visualização somente leitura de indicadores, catálogo, estoque, pedidos, monitoramento IoT e relatórios (bloqueado para alterações com HTTP 403). |

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v18+ ou v20+ recomendado)
- **npm**

---

### Cenário A — Execução no Computador Atual (com `backend/prisma/dev.db` já existente)

Quando o arquivo `backend/prisma/dev.db` já existe no projeto local, **não é necessário recriar nem popular o banco**. Os dados já estão persistidos.

1. **Iniciar o Backend (Terminal 1):**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run dev
   ```
   O servidor iniciará em loopback local: `http://127.0.0.1:3001` (acessível também via `http://localhost:3001/api/health`).

2. **Iniciar o Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Acesse no navegador: **`http://localhost:5173`**

---

### Cenário B — Inicialização em um Novo Computador (após clonar do GitHub)

Por segurança e boas práticas de versionamento, os arquivos `.env` e `dev.db` não são enviados ao GitHub. Ao clonar o repositório em um novo computador onde o banco ainda não existe:

1. **Configurar e inicializar o Backend:**
   ```bash
   cd backend
   npm install
   npm run env:init
   npm run db:init
   npm run dev
   ```
   - **O que `npm run env:init` faz (`scripts/env-init.js`):** verifica se `backend/.env` existe. Somente se **não existir**, cria `backend/.env` a partir do `.env.example` gerando automaticamente um `JWT_SECRET` criptograficamente aleatório (96 caracteres hexadecimais). Se `backend/.env` já existir, preserva o arquivo sem nenhuma modificação.
   - **O que `npm run db:init` faz (`scripts/db-init.js`):**
     1. Valida se `DATABASE_URL` aponta para um caminho local válido dentro de `backend/`.
     2. Verifica se o arquivo SQLite configurado **já existe no disco antes de executar `prisma db push`**.
     3. **Se o arquivo já existir** (populado, vazio de 0 bytes ou com estrutura inesperada): bloqueia imediatamente antes de `prisma db push` e antes do `seed.ts`, preservando 100% do arquivo existente.
     4. **Somente se o arquivo não existir:** executa `prisma generate`, cria o banco com as 12 tabelas (`prisma db push --skip-generate`) e popula os dados iniciais (`tsx prisma/seed.ts`).
   - **Proteção no `prisma/seed.ts`:** não possui `FORCE_SEED` nem comandos destrutivos (`deleteMany`). Só insere dados se todas as 12 tabelas existirem e estiverem com `0` registros.

2. **Configurar e inicializar o Frontend (em outro terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Acesse no navegador: **`http://localhost:5173`**

---

## 📂 Estrutura de Diretórios

```text
logisense-wms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                      # Modelagem relacional SQLite (12 modelos / 12 tabelas)
│   │   └── seed.ts                            # Seed estritamente não-destrutivo para banco novo e vazio
│   ├── scripts/
│   │   ├── db-init.js                         # Inicialização segura com verificação prévia do arquivo SQLite
│   │   └── env-init.js                        # Geração não-destrutiva de .env com JWT_SECRET aleatório forte
│   ├── src/
│   │   ├── config/                            # Configuração de ambiente, validação de JWT_SECRET e HOST=127.0.0.1
│   │   ├── controllers/                       # Regras de negócio, transações atômicas, IoT e rate limit
│   │   ├── database/                          # Instância singleton do Prisma Client
│   │   ├── middlewares/                       # Autenticação JWT e autorização RBAC
│   │   ├── routes/                            # Rotas REST organizadas por domínio
│   │   └── server.ts                          # Servidor Express com bind local (127.0.0.1), CORS e headers HTTP
│   ├── .env.example                           # Modelo seguro de variáveis de ambiente com placeholders
│   └── package.json                           # Scripts e dependências do backend
├── frontend/
│   ├── src/
│   │   ├── components/                        # Sidebar, Header, KPIs, Gráficos e Alertas
│   │   ├── contexts/                          # AuthContext com sincronização multi-abas e tratamento 401
│   │   ├── layouts/                           # MainLayout com Skip Link e suporte a teclado (Escape)
│   │   ├── pages/                             # Páginas operacionais e gerenciais do WMS
│   │   ├── services/                          # Cliente HTTP centralizado (api.ts)
│   │   └── types/                             # Contratos TypeScript
│   ├── vite.config.ts                         # Configuração Vite + Proxy para http://localhost:3001
│   └── package.json                           # Scripts e dependências do frontend
├── README.md                                  # Documentação técnica e guia de execução
├── RELATORIO_FINAL_LOGISENSE_FASE8.md         # Relatório técnico da Fase 8
└── RELATORIO_FINAL_LOGISENSE_FASE8_1.md       # Relatório técnico da Fase 8.1 (Correções Finais e Auditoria)
```

---

## 📄 Licença e Uso Acadêmico

Projeto desenvolvido para fins acadêmicos no **Projeto Integrado Multidisciplinar III (PIM III)** do curso de **Análise e Desenvolvimento de Sistemas — UNIP**.
