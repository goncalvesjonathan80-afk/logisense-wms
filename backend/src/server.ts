import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import routes from './routes';
import { prisma } from './database/prisma';

const app = express();

// Confiar no primeiro proxy reverso (essencial para Railway e proxies HTTPS)
app.set('trust proxy', 1);

// Desabilitar cabeçalho X-Powered-By por segurança
app.disable('x-powered-by');

// Cabeçalhos HTTP defensivos (Hardening OWASP)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Adicionar HSTS em conexões seguras / HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// Lista explícita de origens permitidas
const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const configuredOrigins = (config.corsOrigin || '')
  .split(',')
  .map((o) => o.trim())
  .filter((o) => Boolean(o) && o !== '*');

if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  configuredOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  configuredOrigins.push(`http://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}

const allowedOrigins = Array.from(new Set([...DEFAULT_LOCAL_ORIGINS, ...configuredOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requisições locais ou same-origin sem cabeçalho Origin (ex.: health check, scripts de teste)
      if (!origin) {
        return callback(null, true);
      }

      // Permitir origens que constem na allowlist configurada
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Em produção no Railway, se a requisição vier do mesmo domínio público configurado
      if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        try {
          const originHost = new URL(origin).host;
          if (originHost === process.env.RAILWAY_PUBLIC_DOMAIN) {
            return callback(null, true);
          }
        } catch {}
      }

      const corsError: any = new Error('Origem não autorizada pelas políticas de segurança CORS');
      corsError.status = 403;
      callback(corsError);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Limite seguro de payload JSON contra abuso de memória (DoS)
app.use(express.json({ limit: '256kb' }));

// Rota de Health Check (Monitoramento de disponibilidade e integridade)
app.get('/api/health', async (_req, res) => {
  try {
    // Verificação da conexão com o banco de dados SQLite
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      api: 'UP',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Em caso de falha de conexão, indicar falha no status HTTP (503 Service Unavailable)
    console.error('Falha na checagem de banco no Health Check (detalhe interno omitido do cliente)');
    res.status(503).json({
      status: 'error',
      api: 'DEGRADED',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Rotas da API
app.use('/api', routes);

// Servir frontend compilado (quando existir em frontend/dist ou caminho configurado)
const clientDistPath = process.env.CLIENT_DIST_PATH
  ? path.resolve(process.env.CLIENT_DIST_PATH)
  : path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(clientDistPath)) {
  // Servir arquivos estáticos (CSS, JS, imagens, favicon, etc.)
  app.use(express.static(clientDistPath, { index: false }));

  // Fallback para SPA (React Router) nas rotas de navegação
  app.get('*', (req, res, next) => {
    // 1. Rotas /api não atendidas caem no middleware 404 da API, nunca em index.html
    if (req.path.startsWith('/api')) {
      return next();
    }

    // 2. Arquivos estáticos inexistentes (com extensão como .js, .css, .png) retornam 404 JSON, nunca index.html
    if (path.extname(req.path)) {
      return res.status(404).json({
        success: false,
        message: `Recurso estático '${req.path}' não encontrado no LOGISENSE WMS`,
      });
    }

    // 3. Rotas de páginas web da aplicação retornam index.html para renderização pelo React Router
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }

    return next();
  });
}

// Middleware 404 para rotas de API não encontradas ou quando frontend dist não existir
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.method} ${req.originalUrl} não encontrada no LOGISENSE WMS`,
  });
});

// Middleware de Erro Global (Tratamento seguro sem exposição de stack trace ou dados internos)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error capturado pelo middleware global:', err.message || err);
  const status = err.status || err.statusCode || 500;
  const safeMessage =
    status >= 500
      ? 'Erro interno do servidor. A operação não pôde ser processada.'
      : err.message || 'Requisição inválida';

  res.status(status).json({
    success: false,
    message: safeMessage,
  });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`🚀 LOGISENSE WMS iniciado em http://${config.host}:${config.port} (${config.isProduction ? 'Produção Railway' : 'SQLite Local'})`);
  console.log(`📍 Health Check: http://${config.host}:${config.port}/api/health`);
  if (fs.existsSync(clientDistPath)) {
    console.log(`🌐 Servindo Frontend SPA compilado a partir de: ${clientDistPath}`);
  }
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Recebido sinal ${signal}, encerrando servidor com segurança...`);
  await prisma.$disconnect();
  server.close(() => {
    console.log('Servidor HTTP encerrado.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
