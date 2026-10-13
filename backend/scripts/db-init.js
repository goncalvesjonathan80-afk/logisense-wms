const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const { initEnv } = require('./env-init');

const backendDir = path.resolve(__dirname, '..');
const prismaDir = path.join(backendDir, 'prisma');
const envPath = path.join(backendDir, '.env');
const isProduction = process.env.NODE_ENV === 'production';
const allowedVolumeDir = path.resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH || '/data');

function resolveAndValidateSqlitePath(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    return {
      valid: false,
      reason: 'A variável DATABASE_URL não está definida ou está vazia.',
    };
  }

  const trimmed = databaseUrl.trim();
  if (!trimmed.startsWith('file:')) {
    return {
      valid: false,
      reason: `DATABASE_URL deve utilizar o protocolo SQLite ("file:..."). Valor recebido não inicia com "file:".`,
    };
  }

  const rawPathWithQuery = trimmed.slice('file:'.length).trim();
  let rawPath = rawPathWithQuery.split('?')[0].trim();

  // Tratamento para URLs do tipo file:///data/logisense.db
  if (rawPath.startsWith('//') && !rawPath.startsWith('///')) {
    rawPath = rawPath.slice(2);
  }

  if (!rawPath || rawPath === '.' || rawPath === './' || rawPath === '.\\' || rawPath.endsWith('/') || rawPath.endsWith('\\')) {
    return {
      valid: false,
      reason: `Caminho de arquivo SQLite inválido em DATABASE_URL ("${trimmed}"). Especifique um nome de arquivo válido (ex.: "file:./dev.db" ou "file:/data/logisense.db").`,
    };
  }

  if (/[\0<>:"|?*]/.test(rawPath.replace(/^[A-Za-z]:/, ''))) {
    return {
      valid: false,
      reason: `Caminho contém caracteres inválidos para arquivo local: "${rawPath}".`,
    };
  }

  let resolvedDbPath;

  if (isProduction) {
    // Em produção (Railway), o banco de dados deve residir exclusivamente no volume persistente autorizado
    resolvedDbPath = path.isAbsolute(rawPath)
      ? path.normalize(rawPath)
      : path.resolve(allowedVolumeDir, rawPath);

    const relativeToVolume = path.relative(allowedVolumeDir, resolvedDbPath);
    if (relativeToVolume.startsWith('..') || path.isAbsolute(relativeToVolume)) {
      return {
        valid: false,
        reason: `Em produção, o banco de dados deve residir exclusivamente no volume persistente autorizado (${allowedVolumeDir}). Caminho configurado foi rejeitado: "${resolvedDbPath}".`,
      };
    }
  } else {
    // No ambiente local/desenvolvimento, o Prisma resolve caminhos relativos a partir do diretório do schema (backend/prisma)
    resolvedDbPath = path.isAbsolute(rawPath)
      ? path.normalize(rawPath)
      : path.resolve(prismaDir, rawPath);

    // Impedir que um caminho escape do diretório do backend (proteção contra path traversal local)
    const relativeToBackend = path.relative(backendDir, resolvedDbPath);
    if (relativeToBackend.startsWith('..') || path.isAbsolute(relativeToBackend)) {
      return {
        valid: false,
        reason: `Por segurança, no modo local o arquivo SQLite deve residir dentro do diretório do backend (${backendDir}). Caminho rejeitado: "${resolvedDbPath}".`,
      };
    }
  }

  const parentDir = path.dirname(resolvedDbPath);
  if (!fs.existsSync(parentDir)) {
    if (isProduction && parentDir === allowedVolumeDir) {
      try {
        fs.mkdirSync(parentDir, { recursive: true });
      } catch (err) {
        return {
          valid: false,
          reason: `Não foi possível acessar ou criar o diretório do volume persistente: "${parentDir}". Erro: ${err.message}`,
        };
      }
    } else {
      return {
        valid: false,
        reason: `O diretório de destino do banco de dados não existe: "${parentDir}". Verifique a variável DATABASE_URL.`,
      };
    }
  }

  const parentStat = fs.statSync(parentDir);
  if (!parentStat.isDirectory()) {
    return {
      valid: false,
      reason: `O caminho pai especificado em DATABASE_URL não é um diretório válido: "${parentDir}".`,
    };
  }

  if (fs.existsSync(resolvedDbPath) && fs.statSync(resolvedDbPath).isDirectory()) {
    return {
      valid: false,
      reason: `O caminho configurado em DATABASE_URL aponta para um diretório existente e não para um arquivo SQLite: "${resolvedDbPath}".`,
    };
  }

  if (!resolvedDbPath.toLowerCase().endsWith('.db') && !resolvedDbPath.toLowerCase().endsWith('.sqlite') && !resolvedDbPath.toLowerCase().endsWith('.sqlite3')) {
    return {
      valid: false,
      reason: `O arquivo configurado em DATABASE_URL deve possuir extensão .db, .sqlite ou .sqlite3. Caminho recebido: "${path.basename(resolvedDbPath)}".`,
    };
  }

  return {
    valid: true,
    resolvedDbPath,
    rawUrl: trimmed,
  };
}

async function verifyExistingSchemaCompatibility(rawUrl) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({ datasources: { db: { url: rawUrl } } });
    await prisma.$queryRawUnsafe('SELECT 1');
    await prisma.user.count();
    await prisma.product.count();
    await prisma.order.count();
    await prisma.$disconnect();
    return { compatible: true };
  } catch (err) {
    return {
      compatible: false,
      detail: err.message || String(err),
    };
  }
}

async function main() {
  console.log('======================================================================');
  console.log(`🛡️  LOGISENSE WMS — Inicialização Segura do Banco SQLite (${isProduction ? 'Produção Railway' : 'Local'})`);
  console.log('======================================================================');

  // No modo local, garantir que .env exista caso o usuário tenha acabado de clonar
  if (!isProduction && !process.env.DATABASE_URL && !fs.existsSync(envPath)) {
    initEnv({ silentIfExists: true });
  }

  if (!isProduction && fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const databaseUrl = process.env.DATABASE_URL || (isProduction ? 'file:/data/logisense.db' : undefined);
  const validation = resolveAndValidateSqlitePath(databaseUrl);

  if (!validation.valid) {
    console.error(`❌ Falha na validação de DATABASE_URL: ${validation.reason}`);
    console.error('🔒 Nenhuma operação do Prisma ou seed foi executada.');
    process.exit(1);
  }

  const { resolvedDbPath, rawUrl } = validation;
  const displayPath = isProduction
    ? resolvedDbPath
    : `backend/${path.relative(backendDir, resolvedDbPath).replace(/\\/g, '/')}`;

  // =========================================================================
  // CENÁRIO B — O ARQUIVO SQLITE JÁ EXISTE (Populado, 0 bytes ou estrutura existente)
  // Verificação estrita ANTES de executar prisma db push ou seed
  // =========================================================================
  if (fs.existsSync(resolvedDbPath)) {
    const stat = fs.statSync(resolvedDbPath);
    console.log(`🔒 Arquivo SQLite detectado em: ${displayPath} (${stat.size} bytes).`);
    console.log('✅ Proteção ativa: O arquivo de banco já existe no caminho configurado.');
    console.log('   • "prisma db push" NÃO foi executado.');
    console.log('   • "seed.ts" NÃO foi executado.');
    console.log('   • Nenhum byte do arquivo existente foi alterado ou sobrescrito.');

    if (stat.size === 0) {
      console.log('⚠️  Atenção: O arquivo existente possui 0 bytes (arquivo vazio).');
      console.log('   Por segurança, o script não sobrescreve arquivos existentes silenciosamente.');
      process.exit(0);
    }

    // Validação de compatibilidade do esquema
    console.log('🔍 Verificando compatibilidade de esquema da base existente...');
    const schemaCheck = await verifyExistingSchemaCompatibility(rawUrl);
    if (!schemaCheck.compatible) {
      console.error('❌ Incompatibilidade de esquema detectada no banco de dados existente!');
      console.error('🔒 A inicialização foi cancelada de forma segura para preservar integralmente os dados.');
      console.error(`   Detalhe técnico: ${schemaCheck.detail}`);
      process.exit(1);
    }

    console.log('✅ Esquema do banco validado com sucesso e 100% preservado.');
    console.log('🚀 O banco de dados está pronto para inicialização da aplicação.');
    process.exit(0);
  }

  // =========================================================================
  // CENÁRIO A — O ARQUIVO SQLITE AINDA NÃO EXISTE
  // Criar o banco, aplicar o schema de 12 modelos e popular com dados iniciais
  // =========================================================================
  console.log(`🆕 Nenhum arquivo encontrado em: ${displayPath}`);
  console.log(`⚙️  Iniciando provisionamento seguro de novo banco SQLite (${isProduction ? 'Produção' : 'Local'})...`);

  const execEnv = { ...process.env, DATABASE_URL: rawUrl };

  try {
    console.log('\n[1/3] Gerando Prisma Client (npx prisma generate)...');
    execSync('npx prisma generate', { cwd: backendDir, stdio: 'inherit', env: execEnv });

    console.log('\n[2/3] Criando estrutura de 12 tabelas no novo arquivo SQLite (npx prisma db push --skip-generate)...');
    execSync('npx prisma db push --skip-generate', { cwd: backendDir, stdio: 'inherit', env: execEnv });

    console.log('\n[3/3] Populando dados iniciais (npx tsx prisma/seed.ts)...');
    execSync('npx tsx prisma/seed.ts', { cwd: backendDir, stdio: 'inherit', env: execEnv });

    const finalStat = fs.statSync(resolvedDbPath);
    console.log('\n======================================================================');
    console.log(`✅ Novo banco SQLite criado e inicializado com sucesso!`);
    console.log(`📁 Arquivo: ${displayPath} (${finalStat.size} bytes)`);
    console.log('🚀 O LOGISENSE WMS está pronto para uso.');
    console.log('======================================================================');
  } catch (err) {
    console.error('\n❌ Ocorreu um erro durante a inicialização do novo banco SQLite.');
    console.error(`   Detalhe: ${err.message || err}`);
    process.exit(1);
  }
}

main();
