import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const KNOWN_PLACEHOLDERS = new Set([
  '',
  'SUBSTITUA_POR_SEGREDO_ALEATORIO_FORTE_OU_EXECUTE_NPM_RUN_ENV_INIT',
  'logisense-secret-key-pim-iii-2026-secure',
  'changeme',
  'secret',
]);

function resolveJwtSecret(): string {
  const rawSecret = (process.env.JWT_SECRET || '').trim();

  if (!rawSecret) {
    console.warn(
      '⚠️  [SEGURANÇA] JWT_SECRET não definido no ambiente. Gerando chave efêmera em memória para esta sessão local. Execute "npm run env:init" para persistir um segredo forte no .env.'
    );
    return crypto.randomBytes(48).toString('hex');
  }

  if (KNOWN_PLACEHOLDERS.has(rawSecret) || rawSecret.length < 32) {
    console.warn(
      '⚠️  [SEGURANÇA] JWT_SECRET configurado utiliza valor padrão/placeholder ou possui menos de 32 caracteres. Recomenda-se gerar um segredo forte executando "npm run env:init" (valor do segredo omitido por segurança).'
    );
  }

  return rawSecret;
}

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
