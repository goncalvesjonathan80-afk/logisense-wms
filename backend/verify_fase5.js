/**
 * LOGISENSE WMS - Suíte de Testes Automatizados da FASE 5
 * IoT Simulado, Alertas de Ambiente e Relatórios Operacionais
 */

const BASE_URL = 'http://localhost:3001/api';

let adminToken = '';
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
  console.log('\n======================================================');
  console.log('🚀 INICIANDO VALIDAÇÃO COMPLETA DA FASE 5 (21 TESTES)');
  console.log('======================================================\n');

  // Autenticação dos perfis
  console.log('🔑 Efetuando autenticação dos perfis de teste...');
  adminToken = await login('admin@logisense.com', 'admin123');
  operadorToken = await login('operador@logisense.com', 'operador123');
  consultaToken = await login('consulta@logisense.com', 'consulta123');
  console.log('  -> Admin, Operador e Consulta autenticados com sucesso.\n');

  // 1. GET /api/iot/telemetry -> 200
  console.log('🧪 Teste 1: Listagem de leituras de telemetria...');
  const res1 = await fetch(`${BASE_URL}/iot/telemetry`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res1.status === 200, 'GET /api/iot/telemetry retornou HTTP 200');
  const data1 = await res1.json();
  assert(Array.isArray(data1.readings), 'Resposta contém array de readings');

  // 2. GET /api/iot/telemetry/latest -> 200
  console.log('🧪 Teste 2: Últimas leituras consolidadas por área...');
  const res2 = await fetch(`${BASE_URL}/iot/telemetry/latest`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res2.status === 200, 'GET /api/iot/telemetry/latest retornou HTTP 200');
  const data2 = await res2.json();
  assert(data2.latest && typeof data2.latest === 'object', 'Resposta contém objeto com leituras por área');

  // 3. POST /api/iot/telemetry/simulate -> 201
  console.log('🧪 Teste 3: Disparo manual de simulação de telemetria IoT...');
  const res3 = await fetch(`${BASE_URL}/iot/telemetry/simulate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res3.status === 201, 'POST /api/iot/telemetry/simulate retornou HTTP 201');
  const data3 = await res3.json();
  assert(Array.isArray(data3.readings) && data3.readings.length === 3, 'Simulação gerou leituras para as 3 áreas (A, B, C)');

  // 4. Validação dos dados gravados no banco
  console.log('🧪 Teste 4: Validação dos campos da leitura salva (timestamp, área, temperatura, umidade)...');
  const readingAreaA = data3.readings.find((r) => r.area.includes('A'));
  assert(
    readingAreaA &&
      readingAreaA.temperature !== undefined &&
      readingAreaA.humidity !== undefined &&
      readingAreaA.timestamp,
    'Leitura da Área A possui timestamp, temperatura e umidade válidos'
  );

  // Preparação de alertas para teste determinístico de criação
  const openAlertsCheck = await fetch(`${BASE_URL}/iot/alerts?status=OPEN`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (openAlertsCheck.ok) {
    const { alerts } = await openAlertsCheck.json();
    for (const a of alerts) {
      await fetch(`${BASE_URL}/iot/alerts/${a.id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Resolução automática pré-teste' }),
      });
    }
  }

  // 5 e 6: Testar detecção de limites e geração de alertas (com payload forçado de out-of-bounds)
  console.log('🧪 Teste 5: Verificação de alerta de temperatura fora do limite...');
  const res5 = await fetch(`${BASE_URL}/iot/telemetry/simulate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      readings: [
        { area: 'Área A', temperature: 35.5, humidity: 55.0 }, // Temp > 30°C
      ],
    }),
  });
  assert(res5.status === 201, 'POST simulação forçada retornou HTTP 201');
  const data5 = await res5.json();
  const tempAlert = data5.alertsCreated.find((a) => a.type === 'TEMPERATURA' && a.area.includes('A'));
  assert(tempAlert !== undefined, 'Alerta de temperatura foi gerado para Área A (35.5°C > 30°C)');

  console.log('🧪 Teste 6: Verificação de alerta de umidade fora do limite...');
  const res6 = await fetch(`${BASE_URL}/iot/telemetry/simulate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      readings: [
        { area: 'Área B', temperature: 22.0, humidity: 82.0 }, // Umidade > 70%
      ],
    }),
  });
  assert(res6.status === 201, 'POST simulação com umidade alta retornou HTTP 201');
  const data6 = await res6.json();
  const humAlert = data6.alertsCreated.find((a) => a.type === 'UMIDADE' && a.area.includes('B'));
  assert(humAlert !== undefined, 'Alerta de umidade foi gerado para Área B (82% > 70%)');

  // 7. Anti-duplicação: não gerar segundo alerta OPEN para mesma área e tipo
  console.log('🧪 Teste 7: Anti-duplicação de alertas OPEN (mesma área e tipo)...');
  const res7 = await fetch(`${BASE_URL}/iot/telemetry/simulate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      readings: [
        { area: 'Área A', temperature: 36.0, humidity: 55.0 }, // Repetindo temperatura alta para Área A
      ],
    }),
  });
  assert(res7.status === 201, 'POST simulação repetida retornou HTTP 201');
  const data7 = await res7.json();
  const duplicateAlert = data7.alertsCreated.find((a) => a.type === 'TEMPERATURA' && a.area.includes('A'));
  assert(duplicateAlert === undefined, 'Anti-duplicação impediu criação de novo alerta OPEN para Área A');

  // 8. Listar alertas
  console.log('🧪 Teste 8: Listagem de alertas via GET /api/iot/alerts...');
  const res8 = await fetch(`${BASE_URL}/iot/alerts?status=OPEN`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res8.status === 200, 'GET /api/iot/alerts retornou HTTP 200');
  const data8 = await res8.json();
  assert(Array.isArray(data8.alerts) && data8.alerts.length >= 2, 'Lista contém alertas OPEN cadastrados');
  const alertToResolve = data8.alerts.find((a) => a.area.includes('A') && a.status === 'OPEN');
  assert(alertToResolve !== undefined, 'Alerta da Área A localizado para resolução');

  // 9. Resolução de alerta pelo ADMIN
  console.log('🧪 Teste 9: Resolução de alerta via PATCH /api/iot/alerts/:id/resolve...');
  const res9 = await fetch(`${BASE_URL}/iot/alerts/${alertToResolve.id}/resolve`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note: 'Ajuste de termostato executado pela equipe técnica.' }),
  });
  assert(res9.status === 200, 'PATCH /api/iot/alerts/:id/resolve retornou HTTP 200');
  const data9 = await res9.json();
  assert(data9.alert && data9.alert.status === 'RESOLVED', 'Alerta teve status alterado para RESOLVED');

  // 10. Validar dados de resolução
  console.log('🧪 Teste 10: Validação dos campos de resolução (resolvedBy e resolvedAt)...');
  assert(data9.alert.resolvedBy && data9.alert.resolvedAt, 'Alerta contém resolvedBy e resolvedAt preenchidos');

  // 11. Validação de AuditLog na resolução
  console.log('🧪 Teste 11: Registro de AuditLog na resolução do alerta...');
  const res11 = await fetch(`${BASE_URL}/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data11 = await res11.json();
  const resolveLog = data11.logs.find(
    (l) => l.action === 'ALERT_RESOLVE' && l.module === 'IOT' && l.description && l.description.includes(alertToResolve.title)
  );
  assert(resolveLog !== undefined, 'AuditLog correspondente à resolução do alerta foi registrado');

  // 12. CONSULTA pode visualizar telemetria e alertas (HTTP 200)
  console.log('🧪 Teste 12: Usuário CONSULTA pode visualizar telemetria e alertas...');
  const res12a = await fetch(`${BASE_URL}/iot/telemetry`, {
    headers: { Authorization: `Bearer ${consultaToken}` },
  });
  const res12b = await fetch(`${BASE_URL}/iot/alerts`, {
    headers: { Authorization: `Bearer ${consultaToken}` },
  });
  assert(res12a.status === 200 && res12b.status === 200, 'CONSULTA acessou telemetria e alertas com HTTP 200');

  // 13. CONSULTA é bloqueado ao tentar resolver alerta (HTTP 403)
  console.log('🧪 Teste 13: Bloqueio RBAC para CONSULTA tentar resolver alerta...');
  const alertForConsulta = data8.alerts.find((a) => a.area.includes('B') && a.status === 'OPEN');
  const res13 = await fetch(`${BASE_URL}/iot/alerts/${alertForConsulta.id}/resolve`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${consultaToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note: 'Tentativa indevida' }),
  });
  assert(res13.status === 403, 'CONSULTA recebeu HTTP 403 Forbidden ao tentar resolver alerta');

  // 14. OPERADOR pode resolver alerta (HTTP 200)
  console.log('🧪 Teste 14: Permissão RBAC para OPERADOR resolver alerta...');
  const res14 = await fetch(`${BASE_URL}/iot/alerts/${alertForConsulta.id}/resolve`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${operadorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note: 'Desumidificador acionado pelo operador.' }),
  });
  assert(res14.status === 200, 'OPERADOR resolveu alerta com HTTP 200');
  const data14 = await res14.json();
  assert(data14.alert.status === 'RESOLVED', 'Alerta resolvido com sucesso pelo operador');

  // 15. GET /api/reports/stock -> 200
  console.log('🧪 Teste 15: Relatório de Estoque (GET /api/reports/stock)...');
  const res15 = await fetch(`${BASE_URL}/reports/stock`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res15.status === 200, 'GET /api/reports/stock retornou HTTP 200');
  const data15 = await res15.json();
  assert(Array.isArray(data15.report) && data15.total !== undefined, 'Relatório de estoque contém array report e total');

  // 16. GET /api/reports/movements -> 200
  console.log('🧪 Teste 16: Relatório de Movimentações (GET /api/reports/movements)...');
  const res16 = await fetch(`${BASE_URL}/reports/movements`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res16.status === 200, 'GET /api/reports/movements retornou HTTP 200');
  const data16 = await res16.json();
  assert(Array.isArray(data16.report) && data16.total !== undefined, 'Relatório de movimentações contém array report e total');

  // 17. GET /api/reports/receivings -> 200
  console.log('🧪 Teste 17: Relatório de Recebimentos (GET /api/reports/receivings)...');
  const res17 = await fetch(`${BASE_URL}/reports/receivings`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res17.status === 200, 'GET /api/reports/receivings retornou HTTP 200');
  const data17 = await res17.json();
  assert(Array.isArray(data17.report) && data17.total !== undefined, 'Relatório de recebimentos contém array report e total');

  // 18. GET /api/reports/orders -> 200
  console.log('🧪 Teste 18: Relatório de Pedidos & Expedições (GET /api/reports/orders)...');
  const res18 = await fetch(`${BASE_URL}/reports/orders`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res18.status === 200, 'GET /api/reports/orders retornou HTTP 200');
  const data18 = await res18.json();
  assert(Array.isArray(data18.report) && data18.total !== undefined, 'Relatório de pedidos contém array report e total');

  // 19. Filtros dos relatórios
  console.log('🧪 Teste 19: Aplicação de filtros em relatórios (status=SHIPPED)...');
  const res19 = await fetch(`${BASE_URL}/reports/orders?status=SHIPPED`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res19.status === 200, 'Filtro por status em relatórios retornou HTTP 200');
  const data19 = await res19.json();
  const allShipped = data19.report.every((item) => item.status === 'SHIPPED');
  assert(allShipped, 'Todos os itens retornados pelo relatório atendem ao filtro status=SHIPPED');

  // 20. Exportação CSV com UTF-8 BOM e ponto e vírgula
  console.log('🧪 Teste 20: Exportação CSV de relatório (formato compatível Excel)...');
  const res20 = await fetch(`${BASE_URL}/reports/stock?format=csv`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res20.status === 200, 'Exportação CSV retornou HTTP 200');
  const contentType = res20.headers.get('content-type');
  assert(contentType && contentType.includes('text/csv'), 'Content-Type é text/csv');
  const arrayBuffer = await res20.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  assert(buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, 'Arquivo CSV contém BOM UTF-8 (EF BB BF) para Excel');
  const csvText = buffer.toString('utf-8');
  assert(csvText.includes('SKU;') && csvText.includes('Produto;'), 'Cabeçalho do CSV utiliza separador ponto e vírgula (;)');

  // 21. Indicadores no Dashboard
  console.log('🧪 Teste 21: Indicadores de alertas IoT e telemetria no Dashboard...');
  const res21 = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res21.status === 200, 'GET /api/dashboard retornou HTTP 200');
  const data21 = await res21.json();
  assert(
    data21.cards &&
      data21.cards.activeIoTAlertsCount !== undefined &&
      data21.cards.areasInAlertCount !== undefined &&
      data21.iotSummary !== undefined,
    'Dashboard contém activeIoTAlertsCount, areasInAlertCount e iotSummary'
  );

  console.log('\n======================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES DA FASE 5 PASSARAM COM SUCESSO!`);
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES:', err);
  process.exit(1);
});
