/**
 * LOGISENSE WMS - Suite de Testes Automatizados da FASE 4
 * Pedidos, Picking e Expedição
 */

const BASE_URL = 'http://localhost:3001/api';

let adminToken = '';
let operadorToken = '';
let consultaToken = '';
let activeProduct1 = null;
let activeProduct2 = null;
let inactiveProduct = null;

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
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
  console.log('🚀 INICIANDO VALIDAÇÃO COMPLETA DA FASE 4 (19 TESTES)');
  console.log('======================================================\n');

  // Autenticação
  console.log('🔑 Efetuando autenticação dos perfis de teste...');
  adminToken = await login('admin@logisense.com', 'admin123');
  operadorToken = await login('operador@logisense.com', 'operador123');
  consultaToken = await login('consulta@logisense.com', 'consulta123');
  console.log('  -> Admin, Operador e Consulta autenticados.\n');

  // Obter produtos para os testes
  const prodRes = await fetch(`${BASE_URL}/products`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const prodData = await prodRes.json();
  const activeProducts = prodData.products.filter((p) => p.status === 'ACTIVE' && p.currentStock > 10);
  activeProduct1 = activeProducts[0];
  activeProduct2 = activeProducts[1];

  // Criar ou localizar um produto inativo para teste 4
  const inact = prodData.products.find((p) => p.status === 'INACTIVE');
  if (inact) {
    inactiveProduct = inact;
  } else {
    // Inativar um produto temporário
    const catRes = await fetch(`${BASE_URL}/categories`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const catData = await catRes.json();
    const newProd = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        sku: 'TEST-INACT-001',
        name: 'Produto Teste Inativo',
        categoryId: catData.categories[0].id,
        unit: 'UN',
        minStock: 5,
      }),
    }).then((r) => r.json());

    await fetch(`${BASE_URL}/products/${newProd.product.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    inactiveProduct = { id: newProd.product.id, name: 'Produto Teste Inativo', sku: 'TEST-INACT-001' };
  }

  console.log(`📦 Produtos de teste: P1=${activeProduct1.sku} (Estoque: ${activeProduct1.currentStock}), P2=${activeProduct2.sku} (Estoque: ${activeProduct2.currentStock}), Inativo=${inactiveProduct.sku}\n`);

  // TESTE 1: Listar pedidos existentes
  console.log('--- TESTE 1: Listar pedidos existentes ---');
  {
    const res = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, 'Status HTTP deve ser 200');
    assert(Array.isArray(data.orders), 'Retorno deve conter lista de pedidos');
  }

  // TESTE 2: Criar novo pedido válido com status PENDING
  console.log('\n--- TESTE 2: Criar novo pedido válido com status PENDING ---');
  let testOrder1 = null;
  {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Teste Fase 4',
        notes: 'Pedido automatizado de teste',
        items: [
          { productId: activeProduct1.id, requestedQuantity: 5 },
          { productId: activeProduct2.id, requestedQuantity: 3 },
        ],
      }),
    });
    const data = await res.json();
    assert(res.status === 201, 'Status HTTP deve ser 201');
    assert(data.order.status === 'PENDING', 'Status inicial deve ser PENDING');
    assert(data.order.items.length === 2, 'Pedido deve ter 2 itens criados');
    assert(data.order.orderNumber.startsWith('PED-'), 'Número do pedido deve seguir formato PED-XXXX-XXX');
    testOrder1 = data.order;
  }

  // TESTE 3: Rejeitar pedido sem itens (HTTP 400)
  console.log('\n--- TESTE 3: Rejeitar pedido sem itens ---');
  {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Sem Itens',
        items: [],
      }),
    });
    assert(res.status === 400, 'Status HTTP deve ser 400 para pedido sem itens');
  }

  // TESTE 4: Rejeitar pedido com produto inativo (HTTP 400)
  console.log('\n--- TESTE 4: Rejeitar pedido com produto inativo ---');
  {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Produto Inativo',
        items: [{ productId: inactiveProduct.id, requestedQuantity: 2 }],
      }),
    });
    const data = await res.json();
    assert(res.status === 400, 'Status HTTP deve ser 400 para produto inativo');
    assert(data.message.includes('inativo'), 'Mensagem de erro deve alertar sobre produto inativo');
  }

  // TESTE 5: Rejeitar pedido com quantidade zero ou negativa (HTTP 400)
  console.log('\n--- TESTE 5: Rejeitar quantidade zero ou negativa ---');
  {
    const resZero = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Qtd Zero',
        items: [{ productId: activeProduct1.id, requestedQuantity: 0 }],
      }),
    });
    assert(resZero.status === 400, 'Status HTTP deve ser 400 para quantidade zero');

    const resNeg = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Qtd Negativa',
        items: [{ productId: activeProduct1.id, requestedQuantity: -4 }],
      }),
    });
    assert(resNeg.status === 400, 'Status HTTP deve ser 400 para quantidade negativa');
  }

  // TESTE 6: Adicionar item a pedido com status PENDING (sucesso)
  console.log('\n--- TESTE 6: Adicionar item a pedido PENDING ---');
  {
    const res = await fetch(`${BASE_URL}/orders/${testOrder1.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        productId: activeProduct1.id,
        requestedQuantity: 2,
      }),
    });
    const data = await res.json();
    assert(res.status === 201, 'Status HTTP deve ser 201 ao adicionar item');
    assert(data.item.requestedQuantity === 2, 'Quantidade solicitada do novo item deve ser 2');
  }

  // TESTE 8: Iniciar separação: transição PENDING -> PICKING (sucesso)
  console.log('\n--- TESTE 8: Iniciar separação: transição PENDING -> PICKING ---');
  {
    const res = await fetch(`${BASE_URL}/orders/${testOrder1.id}/start-picking`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${operadorToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, 'Status HTTP deve ser 200 ao iniciar separação');
    assert(data.order.status === 'PICKING', 'Status do pedido deve ter mudado para PICKING');
  }

  // TESTE 7: Rejeitar adicionar item a pedido que não esteja PENDING (HTTP 400)
  console.log('\n--- TESTE 7: Rejeitar adicionar item a pedido em PICKING ---');
  {
    const res = await fetch(`${BASE_URL}/orders/${testOrder1.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        productId: activeProduct1.id,
        requestedQuantity: 1,
      }),
    });
    assert(res.status === 400, 'Status HTTP deve ser 400 ao adicionar item em pedido que não está PENDING');
  }

  // TESTE 9: Rejeitar iniciar separação de pedido que já esteja em PICKING (HTTP 400)
  console.log('\n--- TESTE 9: Rejeitar iniciar separação de pedido já em PICKING ---');
  {
    const res = await fetch(`${BASE_URL}/orders/${testOrder1.id}/start-picking`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 400, 'Status HTTP deve ser 400 ao tentar iniciar separação novamente');
  }

  // TESTE 12: Rejeitar quantidade separada negativa na conferência (HTTP 400)
  console.log('\n--- TESTE 12: Rejeitar quantidade separada negativa ---');
  {
    // Obter detalhes do pedido para pegar os IDs dos itens
    const getRes = await fetch(`${BASE_URL}/orders/${testOrder1.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const { order } = await getRes.json();
    const itemsPayload = order.items.map((it) => ({ id: it.id, pickedQuantity: -1 }));

    const res = await fetch(`${BASE_URL}/orders/${testOrder1.id}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operadorToken}` },
      body: JSON.stringify({ items: itemsPayload }),
    });
    assert(res.status === 400, 'Status HTTP deve ser 400 para quantidade separada negativa');
  }

  // TESTE 10 & 11: Registrar conferência de separação (PICKING -> PICKED) e permitir pickedQuantity = 0
  console.log('\n--- TESTE 10 & 11: Registrar conferência com sucesso e permitir pickedQuantity = 0 ---');
  {
    const getRes = await fetch(`${BASE_URL}/orders/${testOrder1.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const { order } = await getRes.json();

    // Primeiro item com quantidade real, segundo com 0 (falta física), terceiro com quantidade real
    const itemsPayload = order.items.map((it, idx) => ({
      id: it.id,
      pickedQuantity: idx === 1 ? 0 : it.requestedQuantity,
    }));

    const res = await fetch(`${BASE_URL}/orders/${testOrder1.id}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operadorToken}` },
      body: JSON.stringify({ items: itemsPayload }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Status HTTP deve ser 200 ao registrar conferência');
    assert(data.order.status === 'PICKED', 'Status do pedido deve ter mudado para PICKED');
    assert(data.order.pickedBy !== null, 'Campo pickedBy deve estar registrado');

    const itemZero = data.order.items.find((it, idx) => idx === 1);
    assert(itemZero.pickedQuantity === 0, 'Permitiu pickedQuantity = 0 representando falta física');
  }

  // TESTE 13: Rejeitar conferência em pedido que não esteja em PICKING (HTTP 400)
  console.log('\n--- TESTE 13: Rejeitar conferência em pedido já PICKED ---');
  {
    const res = await fetch(`${BASE_URL}/orders/${testOrder1.id}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operadorToken}` },
      body: JSON.stringify({ items: [] }),
    });
    assert(res.status === 400, 'Status HTTP deve ser 400 pois pedido está em status PICKED');
  }

  // TESTE 14: Expedir pedido com estoque suficiente: PICKED -> SHIPPED com baixa atômica
  console.log('\n--- TESTE 14: Expedição com estoque suficiente (baixa atômica) ---');
  {
    // Consultar estoque inicial do produto 1
    const p1Before = await fetch(`${BASE_URL}/products/${activeProduct1.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const initialStock = p1Before.product.currentStock;

    const res = await fetch(`${BASE_URL}/orders/${testOrder1.id}/ship`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${operadorToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, 'Status HTTP deve ser 200 ao expedir pedido');
    assert(data.order.status === 'SHIPPED', 'Status do pedido deve ser SHIPPED');
    assert(data.order.shippedBy !== null, 'Campo shippedBy deve estar preenchido');

    // Verificar se o estoque foi realmente deduzido
    const p1After = await fetch(`${BASE_URL}/products/${activeProduct1.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(
      p1After.product.currentStock < initialStock,
      `Estoque deve ter sido reduzido (Antes: ${initialStock}, Depois: ${p1After.product.currentStock})`
    );

    // Verificar se gerou movimentação EXIT
    const movRes = await fetch(`${BASE_URL}/stock/movements?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const exitMovement = movRes.movements.find(
      (m) => m.type === 'EXIT' && m.destination === 'EXPEDIÇÃO' && m.notes.includes(testOrder1.orderNumber)
    );
    assert(exitMovement !== undefined, 'Deve existir registro de StockMovement EXIT para a expedição');
  }

  // TESTE 15: Rejeitar expedição de pedido com estoque insuficiente (bloqueio atômico)
  console.log('\n--- TESTE 15: Rejeitar expedição com estoque insuficiente ---');
  {
    // Criar pedido com quantidade astronômica superior ao saldo disponível
    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Sem Estoque',
        items: [{ productId: activeProduct1.id, requestedQuantity: 999999 }],
      }),
    }).then((r) => r.json());
    const oId = orderRes.order.id;

    // Iniciar separação
    await fetch(`${BASE_URL}/orders/${oId}/start-picking`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Conferir com quantidade superior ao estoque
    const getO = await fetch(`${BASE_URL}/orders/${oId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());

    await fetch(`${BASE_URL}/orders/${oId}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        items: [{ id: getO.order.items[0].id, pickedQuantity: 999999 }],
      }),
    });

    // Tentar expedir: deve falhar com HTTP 400
    const shipRes = await fetch(`${BASE_URL}/orders/${oId}/ship`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const shipData = await shipRes.json();
    assert(shipRes.status === 400, 'Status HTTP deve ser 400 para estoque insuficiente');
    assert(shipData.message.includes('Estoque insuficiente'), 'Mensagem deve indicar estoque insuficiente');
  }

  // TESTE 16: Rejeitar expedição de pedido onde todos os itens tenham quantidade separada = 0
  console.log('\n--- TESTE 16: Rejeitar expedição com todos os itens zerados (0) ---');
  {
    const oRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Itens Faltantes',
        items: [{ productId: activeProduct2.id, requestedQuantity: 2 }],
      }),
    }).then((r) => r.json());
    const oId = oRes.order.id;

    await fetch(`${BASE_URL}/orders/${oId}/start-picking`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const getO = await fetch(`${BASE_URL}/orders/${oId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());

    await fetch(`${BASE_URL}/orders/${oId}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        items: [{ id: getO.order.items[0].id, pickedQuantity: 0 }],
      }),
    });

    const shipRes = await fetch(`${BASE_URL}/orders/${oId}/ship`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(shipRes.status === 400, 'Status HTTP deve ser 400 quando todos os itens têm pickedQuantity = 0');
  }

  // TESTE 17: Rejeitar expedição de pedido que não esteja em status PICKED (HTTP 400)
  console.log('\n--- TESTE 17: Rejeitar expedição de pedido que não esteja PICKED ---');
  {
    const oRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Pedido Pendente',
        items: [{ productId: activeProduct2.id, requestedQuantity: 1 }],
      }),
    }).then((r) => r.json());

    // Tentar expedir direto de PENDING
    const shipRes = await fetch(`${BASE_URL}/orders/${oRes.order.id}/ship`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(shipRes.status === 400, 'Status HTTP deve ser 400 ao tentar expedir pedido que ainda está PENDING');
  }

  // TESTE 18: Cancelar pedido em PENDING, PICKING ou PICKED (sucesso)
  console.log('\n--- TESTE 18: Cancelar pedido antes da expedição ---');
  let orderToCancel = null;
  {
    const oRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Para Cancelamento',
        items: [{ productId: activeProduct2.id, requestedQuantity: 1 }],
      }),
    }).then((r) => r.json());
    orderToCancel = oRes.order;

    const cancelRes = await fetch(`${BASE_URL}/orders/${orderToCancel.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200, 'Status HTTP deve ser 200 ao cancelar pedido');
    assert(cancelData.order.status === 'CANCELLED', 'Status do pedido deve ser CANCELLED');
  }

  // TESTE 19: Rejeitar cancelamento de pedido já SHIPPED (HTTP 400)
  console.log('\n--- TESTE 19: Rejeitar cancelamento de pedido já SHIPPED ---');
  {
    const res = await fetch(`${BASE_URL}/orders/${testOrder1.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 400, 'Status HTTP deve ser 400 ao tentar cancelar pedido já expedido (SHIPPED)');
  }

  // TESTES ADICIONAIS DE RBAC
  console.log('\n--- TESTES RBAC (PERFIS DE ACESSO) ---');
  {
    // OPERADOR não pode cancelar pedido (apenas ADMIN e GERENTE)
    const oRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Teste RBAC',
        items: [{ productId: activeProduct2.id, requestedQuantity: 1 }],
      }),
    }).then((r) => r.json());

    const opCancelRes = await fetch(`${BASE_URL}/orders/${oRes.order.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${operadorToken}` },
    });
    assert(opCancelRes.status === 403, 'OPERADOR deve receber HTTP 403 ao tentar cancelar pedido');

    // CONSULTA não pode criar pedido
    const consultaCreateRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${consultaToken}` },
      body: JSON.stringify({
        customerName: 'Cliente Consulta Tentativa',
        items: [{ productId: activeProduct2.id, requestedQuantity: 1 }],
      }),
    });
    assert(consultaCreateRes.status === 403, 'CONSULTA deve receber HTTP 403 ao tentar criar pedido');

    // Limpar pedido teste
    await fetch(`${BASE_URL}/orders/${oRes.order.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  console.log('\n======================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES FORAM EXECUTADOS COM SUCESSO!`);
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ ERRO DURANTE EXECUÇÃO DOS TESTES:', err);
  process.exit(1);
});
