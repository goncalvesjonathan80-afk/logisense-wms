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
* **Instância Única (1 Réplica):** Obrigatório configurar **exatamente 1 réplica** (`Replicas: 1`), pois volumes persistentes com SQLite não suportam múltiplas réplicas concorrentes.
* **Inicialização em Runtime:** A criação da base de produção ocorre no startup do container (`docker-entrypoint.sh`), após a montagem do volume, e **nunca durante o build**.
* **Demonstração Acadêmica (PIM III):** Acesso facilitado ao corpo docente através da variável `DEMO_MODE=true`, permitindo autenticação direta em 1 clique para os 4 perfis RBAC sem expor senhas.

---

## 2. Passo a Passo de Configuração no Railway

### Passo 1: Criar o Projeto no Railway
1. Acesse o [Railway Dashboard](https://railway.com/dashboard).
2. Clique em **"New Project"** $\rightarrow$ **"Deploy from GitHub repo"**.
3. Selecione o repositório `logisense-wms` (branch `feat/railway-deploy` ou `main` após aprovação).

### Passo 2: Configuração de Réplica Única (Obrigatório para SQLite)
> ⚠️ **IMPORTANTE SOBRE CONFIGURAÇÃO DO RAILWAY:**
> O formato legado *Config as Code* (`railway.json` / `railway.toml`) foi descontinuado pelo Railway para novos serviços em favor da configuração pelo **painel web** ou por **Infrastructure as Code (IaC)** via CLI.
>
> **Configuração pelo Painel:**
> 1. No serviço do LOGISENSE WMS, acesse **Settings** $\rightarrow$ **Deploy**.
> 2. Certifique-se de que o número de réplicas esteja configurado em **1** (padrão do Railway).
> 3. Na seção **Restart Policy**, mantenha `On Failure` com retentativas automáticas.

### Passo 3: Criar e Conectar o Volume Persistente
> ⚠️ **OBRIGATÓRIO:** O SQLite de produção necessita de um disco persistente para que os dados sobrevivam a reinicializações e novos deploys.

1. No canvas do seu projeto no Railway, clique no menu **"+"** $\rightarrow$ **"Volume"**.
2. Conecte o Volume ao serviço do LOGISENSE WMS.
3. Configure o **Mount Path** do volume exatamente como:
   ```text
   /data
   ```
4. O tamanho padrão (1 GB ou superior) é suficiente para dezenas de milhares de registros.

### Passo 4: Configurar as Variáveis de Ambiente
Na aba **Variables** do serviço no Railway, defina as seguintes variáveis:

| Variável | Valor Recomendado | Descrição / Finalidade |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Ativa o modo de produção e validações estritas de segurança. |
| `DATABASE_URL` | `file:/data/logisense.db` | Caminho do arquivo SQLite no volume persistente montado em `/data`. |
| `JWT_SECRET` | *[Gere uma chave com 32+ caracteres]* | Chave criptográfica para assinatura dos tokens JWT. **Obrigatório e validado no startup.** |
| `DEMO_MODE` | `true` *(para banca examinadora/PIM III)* | Habilita os 4 botões de 1 clique na tela de login para avaliação acadêmica pelo professor. |
| `INITIAL_ADMIN_PASSWORD` | *[Defina uma senha forte $\ge 12$ caracteres]* | Senha inicial para o usuário `admin@logisense.com` em caso de provisionamento do zero. |

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

### Passo 5: Configurar Domínio Público (Networking)
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
* O endpoint possui **Rate Limiter de requisições por IP** (janela de 10 min / 30 acessos max) que previne abuso, esgotamento de recursos e crescimento excessivo da tabela `AuditLog`.
* Nenhuma senha de produção é transitada via rede ou exposta no frontend.

---

## 4. Comandos de Build e Execução

O Railway utilizará automaticamente o `Dockerfile` presente na raiz do projeto:

* **Build:** Multi-stage Dockerfile utilizando Node.js 22 LTS, executando `npm ci` e compilando `frontend` (Vite) e `backend` (TypeScript + Prisma Client).
* **Entrypoint:** `docker-entrypoint.sh`:
  1. Executa `node backend/scripts/db-init.js`:
     * Valida fail-closed o ponto de montagem persistente `/data` e a presença das variáveis de volume do Railway.
     * Se `/data/logisense.db` já existir: verifica integridade SQLite (`PRAGMA integrity_check`), valida todos os 12 modelos Prisma e **preserva 100% dos dados** sem executar `prisma db push` nem `seed`. Se o arquivo tiver 0 bytes, aborta a inicialização com código de erro 1 sem sobrescrever.
     * Se `/data/logisense.db` ainda não existir: cria as 12 tabelas via `prisma db push --skip-generate` e popula os dados iniciais com senhas seguras (validação estrita contra senhas fracas).
  2. Executa `node backend/dist/server.js`:
     * Escuta em `0.0.0.0` na porta definida pelo Railway (`PORT`).
     * Serve a API em `/api/*` e o frontend SPA em `/*`.

---

## 5. Procedimentos Operacionais: Backup, Restore e Rollback

### Backup Consistente do Banco de Dados SQLite

> ⚠️ **AVISO CRÍTICO SOBRE SQLITE:**
> **Nunca copie diretamente o arquivo SQLite (`cp logisense.db backup.db`) enquanto a aplicação estiver em execução.** Fazer cópias brutas de um arquivo SQLite durante transações ou escritas no diário/WAL pode gerar cópias corrompidas ou estados inconsistentes.

#### Método 1: Backups Automáticos Nativos do Railway Volume (Recomendado)
O Railway oferece backups automáticos nativos de volumes persistentes que congelam snapshots consistentes no nível de armazenamento do bloco:
1. No painel do Railway, selecione o volume persistente anexado ao serviço.
2. Acesse a aba **Backups**.
3. Configure uma política automática:
   * **Daily:** mantido por 7 dias.
   * **Weekly:** mantido por 30 dias.
4. Você pode disparar um snapshot manual a qualquer momento clicando em **"Create Backup"**.

#### Método 2: Backup Consistente via SQLite Online Backup API / Shell
Caso precise extrair um arquivo de backup com a aplicação em execução via `railway shell`:
1. Utilize o comando nativo `.backup` do SQLite, que adquire travas de leitura compartilhadas seguras e garante consistência transacional:
   ```bash
   railway shell
   sqlite3 /data/logisense.db ".backup '/data/logisense-backup-$(date +%Y%m%d%H%M%S).db'"
   ```
2. O arquivo gerado estará 100% consistente e pronto para transferência segura.

### Restauração de Backup (Restore)
Caso seja necessário restaurar um backup existente:

* **Pelo Painel do Railway:** Na aba **Backups** do volume, localize o snapshot desejado e clique em **Restore**.
* **Pelo Railway Shell:**
  1. Pare o tráfego da aplicação ou acesse o container:
     ```bash
     railway shell
     sqlite3 /data/logisense-backup-AAAAMMDD.db ".backup '/data/logisense.db'"
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
| **Acesso Demonstrativo** | Controlado via variável `DEMO_MODE=true` | Controlado via variável `DEMO_MODE=true` |
| **Health Check** | `http://localhost:3001/api/health` | `https://<seu-dominio>/api/health` (503 se o DB cair) |

Para rodar localmente no seu computador:
```bash
# Terminal 1 — Backend:
cd backend
npm run dev

# Terminal 2 — Frontend:
cd frontend
npm run dev
```
O arquivo local `backend/prisma/dev.db` nunca é enviado ao GitHub e nunca é afetado pelo deploy em nuvem.
