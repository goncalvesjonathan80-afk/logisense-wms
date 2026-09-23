/**
 * LOGISENSE WMS - Suíte de Testes Automatizados da FASE 6
 * Segurança, Autenticação, RBAC, Tratamento de Erros, Auditoria e Health Check
 */

const BASE_URL = 'http://localhost:3001/api';

let adminToken = '';
let gerenteToken = '';
let operadorToken = '';
let consultaToken = '';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS [${totalTests}]: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL [${totalTests}]: ${message}`);
    throw new Error(`Falha no teste: ${message}`);
  }
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login falhou para ${email}: ${data.message}`);
  return data.token;
}

async function run() {
  console.log('\n================================================================');
  console.log('🔒 INICIANDO VALIDAÇÃO DE SEGURANÇA E AUDITORIA DA FASE 6 (10 TESTES)');
  console.log('================================================================\n');

  // Autenticação prévia dos 4 perfis RBAC
  console.log('🔑 Efetuando autenticação dos perfis de teste...');
  adminToken = await login('admin@logisense.com', 'admin123');
  gerenteToken = await login('gerente@logisense.com', 'gerente123');
  operadorToken = await login('operador@logisense.com', 'operador123');
  consultaToken = await login('consulta@logisense.com', 'consulta123');
  console.log('  -> Admin, Gerente, Operador e Consulta autenticados.\n');

  // TESTE 1: GET em rota protegida sem token -> HTTP 401
  console.log('🧪 Teste 1: Bloqueio de requisição sem token (HTTP 401)...');
  const res1 = await fetch(`${BASE_URL}/products`, {
    headers: {}, // Sem header de autorização
  });
  assert(res1.status === 401, 'GET /api/products sem token retorna HTTP 401');
  const data1 = await res1.json();
  assert(data1.message && data1.message.includes('Token'), 'Mensagem amigável de token ausente');

  // TESTE 2: Endpoint protegido com token inválido/malformado -> HTTP 401
  console.log('🧪 Teste 2: Bloqueio de requisição com token JWT forjado ou inválido (HTTP 401)...');
  const res2 = await fetch(`${BASE_URL}/products`, {
    headers: { Authorization: 'Bearer token-invalido-forjado-123456' },
  });
  assert(res2.status === 401, 'GET /api/products com token forjado retorna HTTP 401');

  // TESTE 3: Usuário CONSULTA tentando operação administrativa -> HTTP 403
  console.log('🧪 Teste 3: Bloqueio de mutação administrativa para perfil CONSULTA (HTTP 403)...');
  const res3 = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${consultaToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Tentativa Invasiva',
      sku: 'TEST-HACK-01',
      categoryId: 'qualquer',
      unit: 'UN',
    }),
  });
  assert(res3.status === 403, 'CONSULTA tentando criar produto recebe HTTP 403 Forbidden');
  const data3 = await res3.json();
  assert(data3.message && data3.message.includes('CONSULTA'), 'Mensagem informa perfil bloqueado');

  // TESTE 4: Usuário OPERADOR tentando criar produto -> HTTP 403
  console.log('🧪 Teste 4: Bloqueio de criação de produto para perfil OPERADOR (HTTP 403)...');
  const res4 = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${operadorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Produto Operador Bloqueado',
      sku: 'TEST-OP-BLOCK',
      categoryId: 'qualquer',
      unit: 'UN',
    }),
  });
  assert(res4.status === 403, 'OPERADOR tentando cadastrar produto recebe HTTP 403 Forbidden');

  // TESTE 5: Usuário autorizado realizando operação permitida -> Sucesso (200/201)
  console.log('🧪 Teste 5: Execução de operação permitida para perfil autorizado (HTTP 200)...');
  const res5 = await fetch(`${BASE_URL}/products`, {
    headers: { Authorization: `Bearer ${gerenteToken}` },
  });
  assert(res5.status === 200, 'GERENTE consulta lista de produtos com sucesso (HTTP 200)');
  const data5 = await res5.json();
  assert(Array.isArray(data5.products), 'Retorno contém array de produtos');

  // TESTE 6: Endpoint /api/health -> 200 com { status: "ok" }
  console.log('🧪 Teste 6: Disponibilidade e integridade no Health Check (/api/health)...');
  const res6 = await fetch(`${BASE_URL}/health`);
  assert(res6.status === 200, 'GET /api/health retorna HTTP 200');
  const data6 = await res6.json();
  assert(data6.status === 'ok', 'Status da aplicação no health check é "ok"');
  assert(data6.api === 'UP', 'API reportada como "UP"');
  assert(data6.database === 'connected', 'Database reportado como "connected"');
  assert(Boolean(data6.timestamp), 'Health check contém timestamp ISO');

  // TESTE 7: Operação inválida (quantidade zero ou negativa) -> HTTP 400
  console.log('🧪 Teste 7: Rejeição de payload com quantidade inválida (HTTP 400)...');
  // Buscar um produto existente
  const validProduct = data5.products.find((p) => p.status === 'ACTIVE');
  const res7 = await fetch(`${BASE_URL}/stock/movements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: validProduct.id,
      type: 'ENTRY',
      quantity: -15, // Quantidade negativa proibida
    }),
  });
  assert(res7.status === 400, 'Tentativa de movimentar quantidade negativa retorna HTTP 400');
  const data7 = await res7.json();
  assert(data7.message && data7.message.includes('maior que zero'), 'Mensagem amigável de validação');

  // TESTE 8: Recurso inexistente -> HTTP 404
  console.log('🧪 Teste 8: Consulta de recurso inexistente (HTTP 404)...');
  const res8 = await fetch(`${BASE_URL}/products/uuid-inexistente-999999`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res8.status === 404, 'Buscar produto com ID inexistente retorna HTTP 404');
  const data8 = await res8.json();
  assert(data8.message && data8.message.includes('não encontrado'), 'Mensagem informativa de 404');

  // TESTE 9: Erros internos não expõem stack trace, SQL ou segredos
  console.log('🧪 Teste 9: Ausência de vazamento de stack trace ou SQL em requisição com rota inválida...');
  const res9 = await fetch(`${BASE_URL}/rota-inexistente-seguranca-teste`);
  assert(res9.status === 404, 'Rota inexistente retorna 404');
  const text9 = await res9.text();
  assert(!text9.includes('stack'), 'Resposta não contém propriedade stack');
  assert(!text9.includes('node_modules'), 'Resposta não expõe caminhos do sistema operacional');
  assert(!text9.includes('SELECT') && !text9.includes('dev.db'), 'Resposta não expõe SQL ou banco');

  // TESTE 10: Nenhuma senha ou token aparece gravado no AuditLog
  console.log('🧪 Teste 10: Auditoria e LGPD - Nenhuma senha ou token exposto em AuditLog...');
  const res10 = await fetch(`${BASE_URL}/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res10.status === 200, 'Listagem de auditoria retorna HTTP 200');
  const data10 = await res10.json();
  assert(Array.isArray(data10.logs) && data10.logs.length > 0, 'Existem logs de auditoria gravados');

  let leakedCredentials = 0;
  for (const log of data10.logs) {
    const content = JSON.stringify(log).toLowerCase();
    if (
      content.includes('admin123') ||
      content.includes('gerente123') ||
      content.includes('operador123') ||
      content.includes('consulta123') ||
      content.includes('passwordhash') ||
      content.includes('bearer ey')
    ) {
      leakedCredentials++;
    }
  }
  assert(leakedCredentials === 0, 'AuditLog 100% limpo de senhas, credenciais em texto claro e tokens');

  console.log('\n================================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES DE SEGURANÇA DA FASE 6 PASSARAM COM SUCESSO!`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES DA FASE 6:', err);
  process.exit(1);
});
