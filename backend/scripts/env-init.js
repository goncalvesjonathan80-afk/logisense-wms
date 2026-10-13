const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
const envExamplePath = path.join(backendDir, '.env.example');

function initEnv(options = { silentIfExists: false }) {
  if (fs.existsSync(envPath)) {
    if (!options.silentIfExists) {
      console.log('🔒 Arquivo backend/.env já existe e foi preservado integralmente (nenhuma alteração realizada).');
    }
    return { created: false, path: envPath };
  }

  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ Arquivo backend/.env.example não encontrado para servir de modelo.');
    process.exit(1);
  }

  const template = fs.readFileSync(envExamplePath, 'utf8');
  const randomSecret = crypto.randomBytes(48).toString('hex');

  const updatedContent = template.replace(
    /^JWT_SECRET=.*$/m,
    `JWT_SECRET="${randomSecret}"`
  );

  fs.writeFileSync(envPath, updatedContent, { encoding: 'utf8', flag: 'wx' });
  console.log('✅ Arquivo backend/.env criado com sucesso a partir do .env.example.');
  console.log('🔐 Um JWT_SECRET criptograficamente aleatório (96 caracteres hex) foi gerado automaticamente (valor omitido do log por segurança).');
  return { created: true, path: envPath };
}

if (require.main === module) {
  initEnv();
}

module.exports = { initEnv };
