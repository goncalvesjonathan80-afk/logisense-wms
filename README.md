# LOGISENSE WMS – Sistema de Gerenciamento de Armazém

> **Protótipo Funcional e Demonstração Acadêmica (PIM III)**  
> Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas  
> Empresa Fictícia: **LOGISENSE – Soluções Inteligentes em Logística** (Campinas – SP)

---

## 1. Descrição do Projeto

O **LOGISENSE WMS** é uma aplicação web desenvolvida para atender à necessidade de centralização das operações logísticas e controle de estoque de um armazém corporativo de médio porte (1.500 m² de área de armazenagem, aproximadamente 30 colaboradores e infraestrutura de TI corporativa em Campinas - SP).

A aplicação fornece controle unificado de inventário físico, rastreabilidade de entradas e saídas, indicadores operacionais em tempo real e base preparada para integração com sensores IoT.

---

## 2. Tecnologias Utilizadas

### Frontend
- **React 18** com **TypeScript**
- **Vite** (Build tool de alta performance)
- **Tailwind CSS** (Design corporativo, tecnológico e limpo)
- **Lucide React** (Conjunto de ícones consistentes)
- **Recharts** (Gráficos analíticos e dinâmicos)
- **React Router DOM v6** (Roteamento client-side com controle RBAC)

### Backend
- **Node.js** com **TypeScript**
- **Express** (API REST modular e padronizada)
- **Prisma ORM** (Mapeamento objeto-relacional tipado)
- **JSON Web Token (JWT)** (Autenticação sem estado)
- **bcryptjs** (Criptografia e hashing seguro de senhas)
- **CORS** & middlewares de tratamento de erros

### Banco de Dados
- **SQLite** (via Prisma) para desenvolvimento local ágil, leve e autônomo (sem necessidade de instalação de SGBD externo no Windows).
- **Pronto para PostgreSQL**: O schema Prisma foi modelado com total compatibilidade relacional, permitindo migração para PostgreSQL em ambiente de nuvem apenas alterando o provider no `schema.prisma`.

---

## 3. Estrutura de Pastas

```text
logisense-wms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modelagem de dados (10 entidades relacionais)
│   │   ├── seed.ts                # Carga de dados realistas e usuários de teste
│   │   └── dev.db                 # Banco SQLite local gerado
│   ├── src/
│   │   ├── config/                # Variáveis de ambiente centralizadas
│   │   ├── controllers/           # auth, dashboard, products, stock, orders, iot, etc.
│   │   ├── database/              # Conexão singleton Prisma
│   │   ├── middlewares/           # JWT e RBAC (requireAuth, requireRole)
│   │   ├── routes/                # Rotas da API REST (/api/...)
│   │   └── server.ts              # Servidor Express
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── assets/                # Identidade visual LOGISENSE
│   │   ├── components/            # Sidebar, Header, KpiCard, Charts, Alerts, IoTSummary
│   │   ├── contexts/              # AuthContext (login, sessão, checagem RBAC)
│   │   ├── layouts/               # MainLayout responsivo
│   │   ├── pages/                 # LoginPage, DashboardPage, PlaceholderPage
│   │   ├── services/              # Cliente HTTP com injeção de token JWT
│   │   ├── types/                 # Interfaces TypeScript
│   │   ├── App.tsx                # Roteamento protegido com RBAC
│   │   ├── index.css              # Tailwind CSS
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

---

## 4. Usuários de Demonstração (RBAC)

O sistema conta com Controle de Acesso Baseado em Papéis (**RBAC**). Na tela de login há botões de **preenchimento rápido em 1 clique** para avaliação acadêmica:

| Nome | E-mail | Senha | Perfil (Role) | Nível de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| **Carlos Mendes** | `admin@logisense.com` | `admin123` | **ADMIN** | Acesso irrestrito a todos os módulos, usuários e logs de auditoria |
| **Mariana Duarte** | `gerente@logisense.com` | `gerente123` | **GERENTE** | Dashboard, Estoque, Pedidos, Relatórios e Operações |
| **João Silva** | `operador@logisense.com` | `operador123` | **OPERADOR** | Operações (Recebimento, Armazenagem, Picking, Expedição) e consulta de Estoque |
| **Ana Paula** | `consulta@logisense.com` | `consulta123` | **CONSULTA** | Visualização e acompanhamento (Dashboard, Saldo de Estoque, Pedidos) |

---

## 5. Como Instalar e Executar

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **npm**

---

### Passo 1: Configuração do Ambiente (Backend)

No diretório `backend`, verifique o arquivo `.env`. Caso necessário, crie-o a partir do modelo `.env.example`:

```bash
# No Linux/macOS:
cp backend/.env.example backend/.env

# No Windows (CMD / PowerShell):
copy backend\.env.example backend\.env
```

As variáveis de ambiente padrão já vêm prontas para execução local com SQLite, sem segredos reais:
- `PORT=3001`
- `DATABASE_URL="file:./dev.db"`
- `JWT_SECRET="logisense-secret-key-pim-iii-2026-secure"`
- `CORS_ORIGIN="http://localhost:5173"`

> **Importante sobre o Banco de Dados:**  
> O arquivo SQLite pré-configurado (`backend/prisma/dev.db`) já acompanha o pacote com todos os registros de produtos, estoque, pedidos e usuários de teste. **Não é necessário executar `npx prisma db push` nem `npm run prisma:seed`**, preservando os dados já cadastrados.

---

### Passo 2: Iniciar o Backend

Abra um terminal na pasta `backend`:

```text
cd backend
npm install
npm run start
```

*(Caso prefira executar em modo desenvolvimento com recarregamento dinâmico via tsx, utilize `npm run dev`).*

- **URL da API**: `http://localhost:3001`
- **Health Check**: `http://localhost:3001/api/health`

---

### Passo 3: Iniciar o Frontend

Abra outro terminal na pasta `frontend`:

```text
cd frontend
npm install
npm run dev
```

- **URL da Aplicação**: `http://localhost:5173`

---

### Passo 4: Acessar a Aplicação

Abra o navegador em `http://localhost:5173` e realize o login com qualquer um dos usuários de demonstração (ou utilize os atalhos de preenchimento em 1 clique na própria tela de login).

---

## 6. Arquitetura e Segurança

A arquitetura do **LOGISENSE WMS** foi concebida sob rigorosos padrões de engenharia de software e segurança da informação, alinhando-se aos objetivos acadêmicos do **PIM III**:

- **Frontend React 18 / Vite**: Interface Single Page Application (SPA) modular e responsiva, com controle de rotas client-side (`<ProtectedRoute>`), interceptação limpa de sessão e injeção automática de tokens JWT no cabeçalho `Authorization: Bearer <token>`.
- **Backend Node.js / Express**: Arquitetura RESTful modular em camadas (Controllers, Middlewares, Routes, Database Service).
- **Banco de Dados SQLite / Prisma ORM**: Persistência relacional íntegra, segura e autônoma em desenvolvimento local (`dev.db`), com tipagem estática e total compatibilidade para migração posterior em nuvem (PostgreSQL).
- **Autenticação Segura**: Senhas hasheadas utilizando o algoritmo `bcryptjs` com salt de 10 rounds (nunca armazenadas em texto claro). Assinatura de tokens JWT com expiração configurável via variáveis de ambiente (`JWT_EXPIRES_IN=8h`).
- **Autorização no Backend (RBAC)**: O controle de acesso é aplicado de forma mandatória nos endpoints da API via middleware `requireRole(...)`. Tentativas de acesso não autorizado resultam em HTTP 403 Forbidden.
- **Transações Atômicas**: Operações críticas de baixa de estoque na expedição, recebimento/armazenagem e movimentações manuais utilizam `prisma.$transaction`, garantindo o princípio ACID (atomicidade total).
- **Tratamento de Erros e Informações Sensíveis**: A API padroniza respostas de erro (`{ "success": false, "message": "..." }`) e nunca expõe *stack traces*, consultas SQL internas, segredos ou caminhos do servidor ao cliente.
- **Monitoramento e Health Check**: Endpoint público e seguro `GET /api/health` para diagnóstico de integridade da API e conectividade com a base de dados.
- **CORS Configurado**: Origens restritas e parametrizáveis via variável `CORS_ORIGIN`, prevenindo acessos arbitrários não autorizados.

---

## 7. Perfis de Acesso

O LOGISENSE WMS implementa uma matriz de **Controle de Acesso Baseado em Papéis (RBAC)**:

| Perfil | Objetivo | Principais Permissões |
| :--- | :--- | :--- |
| **ADMIN** | Administração completa | Acesso irrestrito a todos os módulos, usuários, configurações e trilha completa de auditoria (`AuditLog`). |
| **GERENTE** | Gestão e operações | Gestão de produtos, acompanhamento de estoque, relatórios operacionais, cancelamento de pedidos/recebimentos e resolução de alertas. |
| **OPERADOR** | Execução operacional | Execução do fluxo de recebimento, conferência, armazenagem, picking, expedição de pedidos e resolução de alertas em campo. |
| **CONSULTA** | Consulta de informações | Acompanhamento somente-leitura de Dashboard, produtos, estoque, pedidos, telemetria e relatórios (sem permissão de mutação). |

---

## 8. Fluxo Arquitetural

### Fluxo de Requisição de Usuário (Web / REST)

```text
Usuário
  ↓ (Navegador Web / HTTPS)
Frontend React (SPA)
  ↓ (API REST / JSON com Bearer JWT)
Backend Node.js (Express)
  ↓ (Validação de Token & RBAC)
Middlewares (authenticate / requireRole)
  ↓ (Regras de Negócio & Transações Atômicas)
Controllers (Order, Stock, Receiving, IoT)
  ↓ (Consultas Tipadas via ORM)
Prisma ORM
  ↓ (Persistência Relacional)
Banco de Dados (SQLite local / PostgreSQL Cloud)
```

### Fluxo de Telemetria Ambiental (IoT Simulado)

```text
Sensores de Ambiente (Áreas A, B e C)
  ↓ (Telemetria de Temperatura e Umidade)
API REST (/api/iot/telemetry/simulate)
  ↓ (Avaliação Automática de Limites: 18–30°C / 40–70%)
Mecanismo de Governança de Alertas (Anti-Duplicação)
  ↓ (Gravação de Leituras e Alertas em Aberto)
Banco de Dados (Tabelas: ioTReading / alerts)
  ↓ (Consolidação em Tempo Real)
Dashboard Operacional & Módulo de Monitoramento IoT
```

---

## 9. Privacidade, LGPD e Minimização de Dados (PIM III)

> **Nota Acadêmica de Boas Práticas**: Esta seção apresenta a aplicação prática dos princípios da Lei Geral de Proteção de Dados Pessoais (**LGPD - Lei nº 13.709/2018**) no contexto de um protótipo acadêmico para o PIM III. Não se trata de uma afirmação de conformidade jurídica auditada, mas sim da demonstração de boas práticas de engenharia de software voltadas à privacidade.

1. **Princípio da Necessidade e Minimização (Art. 6º, III)**:
   - O WMS armazena exclusivamente os dados cadastrais indispensáveis para a identificação funcional dos operadores (`name`, `email`, `role`, `department`, `active`).
   - Não são coletados ou armazenados dados pessoais sensíveis, tais como CPF, RG, dados bancários, biometria ou endereços residenciais.
2. **Princípio da Segurança (Art. 6º, VII)**:
   - Credenciais de acesso são gravadas unicamente na forma de hashes criptográficos irreversíveis gerados com `bcryptjs`.
3. **Princípio da Responsabilização e Rastreabilidade**:
   - A tabela `AuditLog` registra quem executou cada operação crítica no galpão logístico, o módulo correspondente e a data/hora, **sem nunca gravar senhas, credenciais em texto claro ou tokens JWT**.

---

## 10. Disponibilidade, Sistemas Distribuídos e Tolerância a Falhas

Como parte do estudo de **Sistemas Distribuídos e Redes de Computadores** para o PIM III:

- **Desacoplamento Cliente-Servidor**: A separação estrita entre o Frontend React e o Backend Express permite que ambos sejam hospedados, escalados e atualizados de forma independente.
- **Arquitetura Escalável Multi-Instância**: Como a autenticação via JWT é *stateless* (sem estado em memória de sessão no servidor), a API do LOGISENSE WMS está pronta para ser executada em múltiplas instâncias em paralelo atrás de um balanceador de carga (*Load Balancer*).
- **Tolerância a Falhas no Health Check**: O endpoint `GET /api/health` foi projetado para responder de forma resiliente (`status: "ok"` em operação normal e `status: "degraded"` caso a camada de banco de dados se torne indisponível), permitindo que ferramentas de monitoramento de infraestrutura identifiquem a falha sem interrupção abrupta do processo da API.
- **Evolução de Armazenamento**: A camada de abstração provida pelo Prisma ORM viabiliza a migração do banco de desenvolvimento (SQLite) para um cluster gerenciado de alta disponibilidade (PostgreSQL em nuvem) sem necessidade de refatorar as regras de negócio.

---

## 11. Validação e Testes Automatizados

O sistema conta com suítes completas de testes automatizados com 100% de aprovação:

- **Fase 4 (Pedidos, Picking e Expedição)**: `node backend/verify_fase4.js` (37 asserções validadas).
- **Fase 5 (IoT, Alertas e Relatórios)**: `node backend/verify_fase5.js` (40 asserções validadas).
- **Fase 6 (Segurança, RBAC, Health Check e Auditoria)**: `node backend/verify_fase6.js` (24 asserções validadas).

Para executar todas as suítes:
```bash
node backend/verify_fase4.js
node backend/verify_fase5.js
node backend/verify_fase6.js
```
