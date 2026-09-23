import express from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { prisma } from './database/prisma';

const app = express();

// Configuração de CORS segura via variáveis de ambiente
const allowedOrigins = (config.corsOrigin || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requisições sem origin (testes internos, health check, curl) ou origens permitidas
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.some((allowed) => allowed === '*' || origin.startsWith(allowed)) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Origem não autorizada pelas políticas de segurança CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Rota de Health Check (Monitoramento de disponibilidade e integridade para PIM III)
app.get('/api/health', async (_req, res) => {
  try {
    // Verificação simples e segura do banco de dados
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      api: 'UP',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Caso a conexão falhe, não derruba a API e não expõe SQL, stack trace ou caminhos internos
    console.error('Falha na checagem de banco no Health Check (detalhe interno omitido do cliente)');
    res.status(200).json({
      status: 'degraded',
      api: 'UP',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Rotas da API
app.use('/api', routes);

// Middleware 404 (Rota não encontrada)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.method} ${req.originalUrl} não encontrada no LOGISENSE WMS`,
  });
});

// Middleware de Erro Global (Tratamento seguro sem exposição de stack trace ou dados internos)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error capturado pelo middleware global:', err.message || err);
  const status = err.status || 500;
  // Mensagem segura: nunca vazar detalhes de SQL, stack trace ou credenciais
  const safeMessage =
    status >= 500
      ? 'Erro interno do servidor. A operação não pôde ser processada.'
      : err.message || 'Requisição inválida';

  res.status(status).json({
    success: false,
    message: safeMessage,
  });
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 LOGISENSE WMS Backend iniciado na porta ${config.port} (0.0.0.0)`);
  console.log(`📍 Health Check: http://localhost:${config.port}/api/health`);
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
