# 📋 RELATÓRIO TÉCNICO FINAL — LOGISENSE WMS (FASE 8.1)
## Correções Finais, Proteção Definitiva do SQLite, Auditoria e Atualização do GitHub

**Empresa fictícia:** LOGISENSE – Soluções Inteligentes em Logística (Campinas – SP)  
**Sistema:** LOGISENSE WMS (*Warehouse Management System*)  
**Curso:** Tecnologia em Análise e Desenvolvimento de Sistemas — UNIP  
**Projeto Acadêmico:** Projeto Integrado Multidisciplinar III (PIM III)  
**Repositório Oficial:** `https://github.com/goncalvesjonathan80-afk/logisense-wms` (Branch: `main`)  
**Commit de Referência Anterior (Fase 8):** `4d7c6a3`

---

## A. Resumo Executivo

A **Fase 8.1** executou as quatro correções pontuais de segurança e consistência técnica identificadas na revisão independente pós-Fase 8, preservando integralmente todos os módulos funcionais do **LOGISENSE WMS** e garantindo proteção absoluta ao banco SQLite local (`backend/prisma/dev.db`):

1. **Correção 1 — Consistência Exata entre Modelos Prisma e Tabelas SQLite (12 Modelos / 12 Tabelas):**
   - Auditado o arquivo `backend/prisma/schema.prisma` e inspecionado o catálogo interno `sqlite_master` de `backend/prisma/dev.db` em modo estritamente somente leitura.
   - Confirmada a existência exata de **12 modelos Prisma** correspondentes a **12 tabelas de negócio no SQLite** (`users`, `categories`, `locations`, `products`, `stock_movements`, `orders`, `order_items`, `receivings`, `receiving_items`, `audit_logs`, `iot_readings` e `alerts`) e **0 tabelas internas extras**.
   - Corrigida a documentação técnica (`README.md`, `RELATORIO_FINAL_LOGISENSE_FASE8.md` e este relatório) que anteriormente mencionava "10 tabelas" por omitir as duas tabelas associativas de itens (`order_items` e `receiving_items`).

2. **Correção 2 — Eliminação Completa de `FORCE_SEED` e de Comandos Destrutivos no `seed.ts`:**
   - Removida completamente a variável `process.env.FORCE_SEED` e todas as chamadas `deleteMany()` de `backend/prisma/seed.ts`.
   - O `seed.ts` agora consulta previamente a contagem de registros nas **12 tabelas** do banco. Se qualquer tabela possuir registros (`> 0`), o script encerra imediatamente preservando os dados. Se a estrutura do arquivo SQLite for ausente, inesperada ou incompatível com o schema Prisma, o `seed.ts` captura a exceção e encerra com código de erro (`1`) e mensagem explicativa, sem executar nenhuma operação destrutiva.

3. **Correção 3 — Inicialização Realmente Segura em `npm run db:init` (`backend/scripts/db-init.js`):**
   - Substituído o comando direto `"prisma generate && prisma db push && tsx prisma/seed.ts"` por um script dedicado (`backend/scripts/db-init.js`).
   - O script valida o formato e o caminho de `DATABASE_URL` (exigindo protocolo `file:`, extensão `.db`/`.sqlite`/`.sqlite3`, diretório pai existente e localização restrita ao diretório `backend/`, bloqueando *path traversal*).
   - **Verificação antes do `prisma db push`:** se o arquivo SQLite já existir no disco (seja um banco populado como `dev.db`, um arquivo vazio de 0 bytes ou um arquivo com estrutura inesperada), o `db-init.js` interrompe a execução **antes** de chamar `prisma db push` e **antes** do `seed.ts`, preservando 100% dos bytes do arquivo existente.
   - Somente quando o arquivo SQLite **não existe** no caminho configurado, o `db-init.js` executa `npx prisma generate`, `npx prisma db push --skip-generate` e `npx tsx prisma/seed.ts`.

4. **Correção 4 — Bind Local Seguro (`127.0.0.1`) e Hardening de `JWT_SECRET`:**
   - Alterado o bind padrão do servidor HTTP em `backend/src/server.ts` de `0.0.0.0` para `config.host` (`process.env.HOST || '127.0.0.1'`), evitando exposição desnecessária da API em interfaces de rede local/Wi-Fi.
   - Atualizado `backend/.env.example` com `HOST="127.0.0.1"` e placeholder explícito em `JWT_SECRET` (`"SUBSTITUA_POR_SEGREDO_ALEATORIO_FORTE_OU_EXECUTE_NPM_RUN_ENV_INIT"`).
   - Criado o script não-destrutivo `npm run env:init` (`backend/scripts/env-init.js`), que gera `backend/.env` com um `JWT_SECRET` criptograficamente aleatório de 96 caracteres hexadecimais (`crypto.randomBytes(48).toString('hex')`) **somente se `backend/.env` ainda não existir**, preservando integralmente qualquer `.env` já existente.
   - Adicionada validação defensiva em `backend/src/config/index.ts` que emite aviso claro de segurança caso `JWT_SECRET` esteja ausente, curto (`< 32` caracteres) ou utilizando placeholder conhecido, sem jamais imprimir o valor do segredo no console.

---

## B. Confirmação sobre o Banco SQLite (`dev.db`)

- **Caminho do banco principal:** `backend/prisma/dev.db`
- **Caminho do backup original:** `backend/prisma/dev.db.backup_original`
- **Tamanho em bytes (antes e depois da Fase 8.1):** `282.624` bytes
- **Hash SHA-256 (antes e depois da Fase 8.1):**  
  `E3E631982A5A01BC7405D02556039E5A53E81C10457A7213A5E2CEC19424AA82`
- **Integridade estrutural (`PRAGMA integrity_check;`):** `[{"integrity_check":"ok"}]`
- **Confirmação de preservação:** `backend/prisma/dev.db` e `backend/prisma/dev.db.backup_original` permaneceram **100% intocados** (zero bytes alterados). Todos os testes de inicialização e de escrita em rotas da API foram executados exclusivamente sobre arquivos SQLite temporários descartáveis (`temp_new.db`, `temp_populated.db`, `temp_empty.db`, `temp_unexpected.db` e `test_isolated.db`), removidos ao término da bateria.

---

## C. Consistência entre Schema Prisma e SQLite (12 Modelos / 12 Tabelas)

A inspeção direta do `backend/prisma/schema.prisma` confrontada com `SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name;` no `backend/prisma/dev.db` comprovou 100% de compatibilidade estrutural:

- **Total de modelos no `schema.prisma`:** **12**
- **Total de tabelas de negócio no SQLite (`sqlite_master`):** **12**
- **Total de tabelas internas extras (`_prisma_migrations`, `sqlite_sequence`, etc.):** **0**

| # | Modelo Prisma (`schema.prisma`) | Tabela Física no SQLite (`@@map`) | Registros Preservados em `dev.db` | Papel no Domínio Logístico |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `User` | `users` | **4** | Usuários autenticáveis e perfis RBAC (`ADMIN`, `GERENTE`, `OPERADOR`, `CONSULTA`) |
| 2 | `Category` | `categories` | **4** | Categorias de classificação de materiais do armazém |
| 3 | `Location` | `locations` | **8** | Endereços físicos de armazenagem (Corredor, Estante, Posição) |
| 4 | `Product` | `products` | **9** | Catálogo de produtos/SKUs, estoque mínimo, saldo atual e localização |
| 5 | `StockMovement` | `stock_movements` | **28** | Kardex / histórico de entradas, saídas, ajustes e transferências |
| 6 | `Order` | `orders` | **53** | Cabeçalho de pedidos logísticos de expedição |
| 7 | `OrderItem` | `order_items` | **68** | Itens detalhados por pedido (quantidade solicitada vs. separada no *picking*) |
| 8 | `Receiving` | `receivings` | **1** | Cabeçalho de ordens de recebimento de mercadorias |
| 9 | `ReceivingItem` | `receiving_items` | **2** | Itens detalhados por ordem de recebimento (quantidade esperada vs. conferida) |
| 10 | `AuditLog` | `audit_logs` | **375** | Trilha de auditoria operacional e de eventos de autenticação |
| 11 | `IoTReading` | `iot_readings` | **86** | Leituras de telemetria ambiental simulada por área (`Área A`, `Área B`, `Área C`) |
| 12 | `Alert` | `alerts` | **28** | Alertas ativos e históricos de estoque mínimo e temperatura/umidade |
| — | **TOTAL** | **12 tabelas** | **666 registros** | **100% íntegro e compatível com o Prisma Client** |

---

## D. Correção do `seed.ts` (Eliminação de `FORCE_SEED` e `deleteMany`)

No arquivo `backend/prisma/seed.ts`:
- **Removido:** `process.env.FORCE_SEED === 'true'` e todas as 12 chamadas `await prisma.<model>.deleteMany()`.
- **Implementado:**
  1. Bloco `try/catch` executando `Promise.all` com `.count()` nos **12 modelos** do Prisma.
  2. Se o banco não possuir as tabelas esperadas ou tiver estrutura incompatível (ex.: arquivo corrompido ou schema divergente), o bloco `catch` exibe mensagem clara (`❌ Estrutura do banco de dados ausente, inesperada ou incompatível com o schema Prisma atual`) e encerra com `process.exit(1)` sem tocar no arquivo.
  3. Se a soma de registros em qualquer uma das 12 tabelas for `> 0`, o script lista as tabelas populadas, informa que o seed foi ignorado por segurança e encerra sem modificar nenhum dado.
  4. O povoamento inicial só ocorre quando as 12 tabelas existem e todas possuem exatamente `0` registros.

---

## E. Correção do `npm run db:init` (`backend/scripts/db-init.js`)

O script `npm run db:init` foi reestruturado em `backend/scripts/db-init.js` para garantir que `prisma db push` jamais seja executado sobre um arquivo SQLite já existente:

1. **Validação de `DATABASE_URL`:**
   - Exige início com `file:`.
   - Rejeita caminhos vazios, diretórios sem nome de arquivo, caracteres inválidos, extensões fora do padrão (`.db`, `.sqlite`, `.sqlite3`), diretórios pais inexistentes ou tentativas de *path traversal* para fora de `backend/`.
2. **Verificação de existência do arquivo ANTES de `prisma db push`:**
   - Resolve o caminho físico exato a partir de `backend/prisma/` (convenção do Prisma).
   - Se `fs.existsSync(resolvedDbPath)` for `true`:
     - **Não executa `prisma db push`.**
     - **Não executa `seed.ts`.**
     - Exibe o tamanho atual do arquivo preservado, alerta especificamente caso o arquivo tenha `0 bytes` e orienta como configurar um novo arquivo em `DATABASE_URL` caso o usuário deseje inicializar outro banco do zero.
3. **Criação limpa quando o arquivo não existe:**
   - Executa `npx prisma generate`, `npx prisma db push --skip-generate` e `npx tsx prisma/seed.ts`, criando e populando as 12 tabelas no novo arquivo.

### Resultados dos 6 Cenários Obrigatórios Testados (em Arquivos Temporários)

| # | Cenário Testado | Arquivo / Configuração Alvo | Comportamento Observado | Resultado |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Banco inexistente | `file:./temp_new.db` | Criou o arquivo (139.264 bytes), sincronizou as 12 tabelas via `db push` e populou os dados iniciais via `seed.ts`. | ✅ **PASS** |
| 2 | Banco já populado | `file:./temp_populated.db` (cópia de `dev.db`) | Bloqueou **antes** de `prisma db push` e `seed.ts`. Hash SHA-256 permaneceu idêntico (`E3E63198...`). Testado também `npx tsx prisma/seed.ts` direto com `FORCE_SEED=true`: ignorado e preservado 100%. | ✅ **PASS** |
| 3 | Arquivo existente vazio (0 bytes) | `file:./temp_empty.db` (0 bytes) | Detectou a existência do arquivo antes do `db push`, alertou sobre arquivo de 0 bytes, não sobrescreveu e manteve 0 bytes. | ✅ **PASS** |
| 4 | Banco com estrutura inesperada | `file:./temp_unexpected.db` (47 bytes inválidos) | `db:init` bloqueou antes de `db push` preservando o hash; `seed.ts` direto detectou incompatibilidade de estrutura e encerrou com código `1` sem destruir o arquivo. | ✅ **PASS** |
| 5 | Segunda execução consecutiva | `file:./temp_new.db` (2ª chamada seguida de `db:init`) | Detectou o banco recém-criado na 1ª execução, não executou `db push` nem `seed.ts` e preservou o hash SHA-256 (`BE01FC88...`). | ✅ **PASS** |
| 6 | `DATABASE_URL` com caminho inválido | `file:./pasta_inexistente_xyz/banco.db`, `postgres://...`, `file:../../fora_do_backend.db` | Todos os 3 subcenários falharam com código `1` e mensagem clara antes de qualquer chamada ao Prisma. | ✅ **PASS** |

---

## F. Segurança Local (`127.0.0.1`) e `JWT_SECRET`

1. **Bind Local em `127.0.0.1`:**
   - Em `backend/src/config/index.ts`, definido `host: process.env.HOST || '127.0.0.1'`.
   - Em `backend/src/server.ts`, alterado `app.listen(config.port, '0.0.0.0', ...)` para `app.listen(config.port, config.host, ...)`.
   - Confirmado via `netstat -ano` durante a execução que o processo Node escuta exclusivamente em `TCP 127.0.0.1:3001` (loopback), respondendo normalmente tanto a `http://127.0.0.1:3001/api/health` quanto a `http://localhost:3001/api/health` (alvo do proxy Vite).
2. **Placeholder Seguro em `backend/.env.example`:**
   - Substituído o valor antigo por `JWT_SECRET="SUBSTITUA_POR_SEGREDO_ALEATORIO_FORTE_OU_EXECUTE_NPM_RUN_ENV_INIT"` e adicionado `HOST="127.0.0.1"`.
3. **Geração Não-Destrutiva de `.env` (`npm run env:init`):**
   - O script `backend/scripts/env-init.js` usa a flag `'wx'` do sistema de arquivos e verifica `fs.existsSync(envPath)`, garantindo que um `backend/.env` existente jamais seja sobrescrito. Quando `backend/.env` não existe, gera automaticamente um segredo de 48 bytes aleatórios (96 caracteres hexadecimais) sem exibi-lo no terminal.
4. **Validação de `JWT_SECRET` na Inicialização:**
   - `backend/src/config/index.ts` verifica se `JWT_SECRET` está vazio, possui menos de 32 caracteres ou corresponde a um placeholder conhecido, emitindo aviso de segurança no console sem vazar o conteúdo do segredo.

---

## G. Resultados dos Testes Executados

| Categoria | Verificação / Método | Tipo de Verificação | Resultado |
| :--- | :--- | :--- | :---: |
| **Build Backend** | `npm run build` (`prisma generate && tsc`) em `backend/` | Execução Automatizada | ✅ **PASS (0 erros)** |
| **Build Frontend** | `npm run build` (`tsc && vite build`) em `frontend/` | Execução Automatizada | ✅ **PASS (0 erros)** |
| **Proteção `db:init` e `seed.ts`** | 6 cenários de teste + `env:init` com verificação de hash SHA-256 | Execução Automatizada | ✅ **PASS (6/6 cenários)** |
| **Bind de Rede Local** | `netstat -ano` + requisições em `127.0.0.1:3001` e `localhost:3001` | Execução Automatizada | ✅ **PASS (`127.0.0.1:3001`)** |
| **Autenticação e RBAC (4 perfis)** | Login + `/api/auth/me` + bloqueios HTTP 403 (`ADMIN`, `GERENTE`, `OPERADOR`, `CONSULTA`) em cópia isolada | Execução Automatizada | ✅ **PASS (14/14 checks)** |
| **Módulos Operacionais e Relatórios** | Dashboard, Produtos, Categorias, Localizações, Recebimentos, Movimentações, Pedidos, IoT, Alertas, 4 Relatórios e AuditLogs em cópia isolada | Execução Automatizada | ✅ **PASS (12/12 checks)** |
| **Hardening HTTP, CORS e Rate Limit** | Headers `nosniff`/`DENY`, CORS allowlist (`localhost:5173` permitido / origem externa bloqueada com 403) e HTTP 429 após 10 falhas de login | Execução Automatizada | ✅ **PASS (4/4 checks)** |
| **Acessibilidade e LGPD** | *Skip link*, `:focus-visible`, `Escape` em modais, atributos ARIA e minimização de dados no schema/logs | Inspeção Técnica de Código | ✅ **Verificado em Código** |

---

## H. Limitações Técnicas Conhecidas (Transparência Acadêmica)

Para fins de documentação acadêmica rigorosa no PIM III, registram-se as seguintes características de escopo local do projeto:

1. **Rate Limit de Login em Memória:** o controle de tentativas malsucedidas (`loginAttemptsMap` em `authController.ts`) é armazenado em memória RAM do processo Node.js, sendo adequado para execução local em instância única (reinicia caso o processo do servidor seja reiniciado).
2. **Persistência de Sessão no Frontend em `localStorage`:** o token JWT é mantido em `localStorage` para viabilizar a sincronização instantânea entre abas via `StorageEvent` na arquitetura SPA local.
3. **Banco de Dados SQLite Local (`dev.db`):** projetado para operação local e demonstração acadêmica autônoma, sem dependência de infraestrutura em nuvem.
4. **Telemetria IoT Simulada:** as leituras de temperatura e umidade das Áreas A, B e C são geradas por simulação algorítmica identificadas na interface com a badge `DADOS SIMULADOS — PIM III`, sem conexão com sensores físicos reais.
5. **Acessibilidade:** foram implementadas melhorias práticas de engenharia baseadas nas diretrizes WCAG 2.2 AA (navegação por teclado, foco visível, tecla `Escape`, semântica ARIA e redução de movimento), sem realização de auditoria certificadora externa formal.

---

## I. Arquivos Criados, Modificados e Removidos na Fase 8.1

### Arquivos Criados
- `backend/scripts/db-init.js`
- `backend/scripts/env-init.js`
- `RELATORIO_FINAL_LOGISENSE_FASE8_1.md`

### Arquivos Modificados
- `backend/prisma/seed.ts`
- `backend/package.json`
- `backend/.env.example`
- `backend/src/config/index.ts`
- `backend/src/server.ts`
- `README.md`
- `RELATORIO_FINAL_LOGISENSE_FASE8.md`

### Arquivos Removidos
- Nenhum arquivo do repositório precisou ser removido nesta fase (todos os bancos temporários criados durante os testes foram limpos imediatamente após a validação).

---

## J. Atualização do GitHub

- **Repositório oficial:** `https://github.com/goncalvesjonathan80-afk/logisense-wms.git`
- **Branch:** `main`
- **Verificação de segurança antes do commit/push:**
  - `backend/.env` ignorado (não rastreado).
  - `backend/prisma/dev.db` e `backend/prisma/dev.db.backup_original` ignorados (não rastreados).
  - Nenhum arquivo `.db` temporário, `node_modules/` ou `dist/` incluído no commit.
  - Nenhum segredo real ou senha de banco incluído nos arquivos versionados.

---

## K. Guia Rápido de Execução Local

### 1. Neste computador (com `backend/prisma/dev.db` já existente)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Acesse no navegador: **`http://localhost:5173`**

---

### 2. Em um novo computador (após `git clone`, onde `.env` e `dev.db` ainda não existem)

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run env:init
npm run db:init
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Acesse no navegador: **`http://localhost:5173`**
