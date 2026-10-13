const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const { initEnv } = require('./env-init');

const backendDir = path.resolve(__dirname, '..');
const prismaDir = path.join(backendDir, 'prisma');
const envPath = path.join(backendDir, '.env');

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
      reason: `DATABASE_URL deve utilizar o protocolo SQLite local ("file:..."). Valor recebido não inicia com "file:".`,
    };
  }

  const rawPathWithQuery = trimmed.slice('file:'.length).trim();
  const rawPath = rawPathWithQuery.split('?')[0].trim();

  if (!rawPath || rawPath === '.' || rawPath === './' || rawPath === '.\\' || rawPath.endsWith('/') || rawPath.endsWith('\\')) {
    return {
      valid: false,
      reason: `Caminho de arquivo SQLite inválido em DATABASE_URL ("${trimmed}"). Especifique um nome de arquivo válido (ex.: "file:./dev.db").`,
    };
  }

  if (/[\0<>:"|?*]/.test(rawPath.replace(/^[A-Za-z]:/, ''))) {
    return {
      valid: false,
      reason: `Caminho contém caracteres inválidos para arquivo local: "${rawPath}".`,
    };
  }

  // O Prisma resolve caminhos relativos em DATABASE_URL a partir do diretório onde está o schema.prisma (backend/prisma)
  const resolvedDbPath = path.isAbsolute(rawPath)
    ? path.normalize(rawPath)
    : path.resolve(prismaDir, rawPath);

  // Impedir que um caminho relativo escape do diretório do backend (proteção contra path traversal)
  const relativeToBackend = path.relative(backendDir, resolvedDbPath);
  if (relativeToBackend.startsWith('..') || path.isAbsolute(relativeToBackend)) {
    return {
      valid: false,
      reason: `Por segurança, o arquivo SQLite deve residir dentro do diretório do backend (${backendDir}). Caminho rejeitado: "${resolvedDbPath}".`,
    };
  }

  const parentDir = path.dirname(resolvedDbPath);
  if (!fs.existsSync(parentDir)) {
    return {
      valid: false,
      reason: `O diretório de destino do banco de dados não existe: "${parentDir}". Verifique a variável DATABASE_URL.`,
    };
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
      reason: `O arquivo configurado em DATABASE_URL deve possuir extensão .db, .sqlite ou .sqlite3. Caminho recebido: "${ path.basename(resolvedDbPath) }".`,
    };
  }

  return {
    valid: true,
    resolvedDbPath,
    rawUrl: trimmed,
  };
}

function main() {
  console.log('======================================================================');
  console.log('🛡️  LOGISENSE WMS — Inicialização Segura do Banco SQLite Local (db:init)');
  console.log('======================================================================');

  // Garantir que .env exista caso o usuário tenha acabado de clonar o repositório
  if (!process.env.DATABASE_URL && !fs.existsSync(envPath)) {
    initEnv({ silentIfExists: true });
  }

  dotenv.config({ path: envPath });

  const databaseUrl = process.env.DATABASE_URL;
  const validation = resolveAndValidateSqlitePath(databaseUrl);

  if (!validation.valid) {
    console.error(`❌ Falha na validação de DATABASE_URL: ${validation.reason}`);
    console.error('🔒 Nenhuma operação do Prisma ou seed foi executada.');
    process.exit(1);
  }

  const { resolvedDbPath } = validation;
  const relativeDisplay = path.relative(backendDir, resolvedDbPath);

  // =========================================================================
  // CENÁRIO B — O ARQUIVO SQLITE JÁ EXISTE (Populado, 0 bytes ou estrutura inesperada)
  // Verificação estrita ANTES de executar prisma db push ou seed
  // =========================================================================
  if (fs.existsSync(resolvedDbPath)) {
    const stat = fs.statSync(resolvedDbPath);
    console.log(`🔒 Arquivo SQLite detectado em: backend/${relativeDisplay.replace(/\\/g, '/')} (${stat.size} bytes).`);
    console.log('✅ Proteção ativa: O arquivo de banco já existe no caminho configurado.');
    console.log('   • "prisma db push" NÃO foi executado.');
    console.log('   • "seed.ts" NÃO foi executado.');
    console.log('   • Nenhum byte do arquivo existente foi alterado ou sobrescrito.');
    if (stat.size === 0) {
      console.log('⚠️  Atenção: O arquivo existente possui 0 bytes (arquivo vazio).');
      console.log('   Por segurança, o script não sobrescreve arquivos existentes silenciosamente.');
    }
    console.log('💡 Orientação: Para continuar usando o banco atual, basta iniciar o servidor com "npm run dev".');
    console.log('   Caso deseje criar um banco novo do zero em outro arquivo sem tocar no atual,');
    console.log('   aponte DATABASE_URL para um novo caminho ainda inexistente (ex.: DATABASE_URL="file:./novo_ambiente.db") e execute "npm run db:init".');
    process.exit(0);
  }

  // =========================================================================
  // CENÁRIO A — O ARQUIVO SQLITE AINDA NÃO EXISTE
  // Criar o banco, aplicar o schema de 12 modelos e popular com dados iniciais
  // =========================================================================
  console.log(`🆕 Nenhum arquivo encontrado em: backend/${relativeDisplay.replace(/\\/g, '/')}`);
  console.log('⚙️  Iniciando provisionamento seguro de novo banco SQLite local...');

  const execEnv = { ...process.env, DATABASE_URL: validation.rawUrl };

  try {
    console.log('\n[1/3] Gerando Prisma Client (npx prisma generate)...');
    execSync('npx prisma generate', { cwd: backendDir, stdio: 'inherit', env: execEnv });

    console.log('\n[2/3] Criando estrutura de 12 tabelas no novo arquivo SQLite (npx prisma db push --skip-generate)...');
    execSync('npx prisma db push --skip-generate', { cwd: backendDir, stdio: 'inherit', env: execEnv });

    console.log('\n[3/3] Populando dados iniciais de demonstração (npx tsx prisma/seed.ts)...');
    execSync('npx tsx prisma/seed.ts', { cwd: backendDir, stdio: 'inherit', env: execEnv });

    const finalStat = fs.statSync(resolvedDbPath);
    console.log('\n======================================================================');
    console.log(`✅ Novo banco SQLite criado e inicializado com sucesso!`);
    console.log(`📁 Arquivo: backend/${relativeDisplay.replace(/\\/g, '/')} (${finalStat.size} bytes)`);
    console.log('🚀 O LOGISENSE WMS está pronto para uso ("npm run dev").');
    console.log('======================================================================');
  } catch (err) {
    console.error('\n❌ Ocorreu um erro durante a inicialização do novo banco SQLite.');
    console.error(`   Detalhe: ${err.message || err}`);
    process.exit(1);
  }
}

main();
