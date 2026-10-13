# 🚀 Guia de Publicação no Railway — LOGISENSE WMS
## Arquitetura Single-Service (Frontend React SPA + Backend Express API + SQLite Persistente)

Este guia orienta o processo de deploy do **LOGISENSE WMS** no [Railway](https://railway.com) como uma aplicação web única, preservando integralmente o ambiente local e os dados existentes em `backend/prisma/dev.db`.

---

## 1. Arquitetura da Solução em Produção

```
                        [ Cliente / Navegador Web ]
                                     │
                                (HTTPS / 443)
                                     ▼
                [ Railway Reverse Proxy / Edge Ingress ]
                                     │
                                (HTTP / PORT)
                                     ▼
           ┌──────────────────────────────────────────────────┐
           │           LOGISENSE WMS (Docker Container)       │
           │                                                  │
           │   [ Express Server ] (Porta configurada via PORT)│
           │   ├── /api/*          ──▶ API REST (Node/Prisma) │
           │   ├── /assets/*       ──▶ Static Assets (Vite)   │
           │   └── /* (SPA Fallback) ▶ frontend/dist/index.html│
           │                                                  │
           │   [ Prisma ORM 5.x / Node.js 22 LTS ]            │
           │          │                                       │
           └──────────┼───────────────────────────────────────┘
                      │ (DATABASE_URL=file:/data/logisense.db)
                      ▼
           ┌──────────────────────────────────────────────────┐
           │        Railway Persistent Volume (/data)         │
           │   └── logisense.db (SQLite de Produção)          │
           └──────────────────────────────────────────────────┘
```

### Características Principais
* **Single-Service:** Um único container hospeda a API Node.js/Express e serve os arquivos estáticos compilados do React.
* **Mesma Origem (Same-Origin):** Todas as chamadas para a API utilizam caminhos relativos (`/api`), eliminando a necessidade de chamadas cross-origin ou dependência de `localhost` na nuvem.
* **Volume Persistente:** O arquivo SQLite de produção reside exclusivamente em um **Railway Volume montado em `/data`** (`DATABASE_URL=file:/data/logisense.db`).
* **Instância Única (1 Réplica):** O arquivo de configuração `railway.json` garante estritamente `numReplicas: 1`, evitando concorrência distribuída no SQLite.
* **Inicialização em Runtime:** A criação da base de produção ocorre no startup do container (`docker-entrypoint.sh`), após a montagem do volume, e **nunca durante o build**.
* **Demonstração Acadêmica (PIM III):** Acesso facilitado ao corpo docente através da variável `DEMO_MODE=true`, permitindo autenticação direta em 1 clique para os 4 perfis RBAC sem expor senhas.

---

## 2. Passo a Passo de Configuração no Railway

### Passo 1: Criar o Projeto no Railway
1. Acesse o [Railway Dashboard](https://railway.com/dashboard).
2. Clique em **"New Project"** $\rightarrow$ **"Deploy from GitHub repo"**.
3. Selecione o repositório `logisense-wms` (branch `feat/railway-deploy` ou `main` após aprovação).

### Passo 2: Criar e Conectar o Volume Persistente
> ⚠️ **OBRIGATÓRIO:** O SQLite de produção necessita de um disco persistente para que os dados sobrevivam a reinicializações e novos deploys.

1. No canvas do seu projeto no Railway, clique no menu **"+"** $\rightarrow$ **"Volume"**.
2. Conecte o Volume ao serviço do LOGISENSE WMS.
3. Configure o **Mount Path** do volume exatamente como:
   ```text
   /data
   ```
4. O tamanho padrão (1 GB ou superior) é suficiente para dezenas de milhares de registros.

### Passo 3: Configurar as Variáveis de Ambiente
Na aba **Variables** do serviço no Railway, defina as seguintes variáveis:

| Variável | Valor Recomendado | Descrição / Finalidade |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Ativa o modo de produção e validações estritas de segurança. |
| `DATABASE_URL` | `file:/data/logisense.db` | Caminho do arquivo SQLite no volume persistente montado em `/data`. |
| `JWT_SECRET` | *[Gere uma chave com 32+ caracteres]* | Chave criptográfica para assinatura dos tokens JWT. **Obrigatório e validado no startup.** |
| `DEMO_MODE` | `true` *(para banca examinadora/PIM III)* | Habilita os 4 botões de 1 clique na tela de login para avaliação acadêmica pelo professor. |
| `INITIAL_ADMIN_PASSWORD` | *[Defina uma senha forte]* | Senha inicial para o usuário `admin@logisense.com` em caso de provisionamento do zero. |

#### Variáveis Opcionais:
| Variável | Valor Padrão | Descrição |
| :--- | :--- | :--- |
| `RAILWAY_VOLUME_MOUNT_PATH` | `/data` | Diretório raiz do volume persistente. |
| `JWT_EXPIRES_IN` | `8h` | Tempo de expiração dos tokens de sessão. |
| `CORS_ORIGIN` | `""` | Origens externas adicionais permitidas no CORS. |

> 💡 **Como gerar um JWT_SECRET forte:**
> Você pode gerar uma chave aleatória de 96 caracteres hexadecimais no terminal executando:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### Passo 4: Configurar Domínio Público (Networking)
1. Na aba **Settings** do serviço no Railway, role até a seção **Networking**.
2. Clique em **"Generate Domain"** (ou configure seu domínio customizado).
3. O Railway gerará um endpoint HTTPS do tipo:
   `https://logisense-wms-production.up.railway.app`

---

## 3. Demonstração Acadêmica para o Corpo Docente

Com `DEMO_MODE=true` ativo no Railway, a tela de login apresentará os 4 botões de acesso imediato:

1. **Entrar como Administrador** (`ADMIN` — Carlos Eduardo / TI)
2. **Entrar como Gerente** (`GERENTE` — Fernanda Lima / Administração Logística)
3. **Entrar como Operador** (`OPERADOR` — Marcos Oliveira / Estoque e Expedição)
4. **Entrar como Consulta** (`CONSULTA` — Beatriz Santos / Atendimento)

**Mecanismo de Segurança:**
* A autenticação ocorre diretamente no backend através do endpoint seguro `POST /api/auth/demo-login`.
* O backend valida se `DEMO_MODE=true`, localiza o usuário correspondente ao perfil solicitado, emite um token JWT oficial assinado e registra um evento em `AuditLog`.
* Nenhuma senha de produção é transitada via rede ou exposta no frontend.

---

## 4. Comandos de Build e Execução

O Railway utilizará automaticamente o `Dockerfile` e o `railway.json` presentes na raiz do projeto:

* **Build:** Multi-stage Dockerfile utilizando Node.js 22 LTS, executando `npm ci` e compilando `frontend` (Vite) e `backend` (TypeScript + Prisma Client).
* **Entrypoint:** `docker-entrypoint.sh`:
  1. Executa `node backend/scripts/db-init.js`:
     * Se `/data/logisense.db` já existir: verifica integridade SQLite (`PRAGMA integrity_check`), valida todos os 12 modelos Prisma e **preserva 100% dos dados** sem executar `prisma db push` nem `seed`.
     * Se `/data/logisense.db` ainda não existir: cria as 12 tabelas via `prisma db push --skip-generate` e popula os dados iniciais com senhas seguras.
  2. Executa `node backend/dist/server.js`:
     * Escuta em `0.0.0.0` na porta definida pelo Railway (`PORT`).
     * Serve a API em `/api/*` e o frontend SPA em `/*`.

---

## 5. Procedimentos Operacionais: Backup, Restore e Rollback

### Backup do Banco de Produção (`/data/logisense.db`)
O banco SQLite é um arquivo persistente armazenado no Railway Volume montado em `/data`.

1. **Via Railway CLI / Shell interativo:**
   Conecte-se ao container ou ambiente através do Railway CLI:
   ```bash
   railway login
   railway link
   
   # Conectar na shell do container ativo
   railway shell
   
   # Criar cópia de segurança com timestamp no volume
   cp /data/logisense.db /data/logisense-backup-$(date +%Y%m%d%H%M%S).db
   ```
2. **Download de cópia do arquivo via CLI:**
   Utilize o comando de cópia ou SFTP/SSH do Railway para baixar o arquivo `logisense.db` para seu armazenamento local de segurança.

### Restauração de Backup (Restore)
Caso seja necessário restaurar um backup existente:
1. Conecte-se via `railway shell`:
   ```bash
   cp /data/logisense-backup-AAAAMMDD.db /data/logisense.db
   ```
2. Reinicie o serviço no painel do Railway (**Restart**).
3. O script `db-init.js` detectará a base restaurada existente, validará a integridade do SQLite e dos 12 modelos Prisma, e inicializará o sistema sem sobrescrever os dados.

### Rollback de Deploy
Se um deploy de código apresentar falhas:
1. No painel do Railway, acesse a aba **Deployments**.
2. Localize o deploy anterior que estava operacional e saudável.
3. Clique nos três pontinhos (`...`) $\rightarrow$ **"Rollback to this deployment"**.
4. Como os dados residem isolados no Railway Volume (`/data`), o rollback de código não afeta o banco SQLite.

---

## 6. Como o Ambiente Local Permanece Preservado

Todas as configurações locais existentes foram estritamente preservadas:

| Aspecto | Ambiente Local (Desenvolvimento) | Ambiente Railway (Produção) |
| :--- | :--- | :--- |
| **Banco de Dados** | `backend/prisma/dev.db` (Local) | `/data/logisense.db` (Railway Volume) |
| **Endereço de Escuta** | `127.0.0.1` (loopback seguro) | `0.0.0.0` (exposto via proxy Railway) |
| **Porta Padrão** | `3001` (Backend) / `5173` (Frontend Vite) | Definida por `process.env.PORT` |
| **Chave JWT** | Local via `.env` ou chave efêmera | Obrigatória via variável com 32+ caracteres |
| **Acesso Demonstrativo** | Ativo para testes e desenvolvimento | Controlado via variável `DEMO_MODE=true` |
| **Health Check** | `http://localhost:3001/api/health` | `https://<seu-dominio>/api/health` (503 se o DB cair) |

Para rodar localmente no seu computador, nada mudou:
```bash
# Terminal 1 — Backend:
cd backend
npm run dev

# Terminal 2 — Frontend:
cd frontend
npm run dev
```
O arquivo local `backend/prisma/dev.db` nunca é enviado ao GitHub e nunca é afetado pelo deploy em nuvem.
