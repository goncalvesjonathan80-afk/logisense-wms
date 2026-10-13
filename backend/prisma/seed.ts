import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando estado do banco de dados SQLite local...');

  let counts: Record<string, number>;
  try {
    const [
      users,
      categories,
      locations,
      products,
      stockMovements,
      orders,
      orderItems,
      receivings,
      receivingItems,
      auditLogs,
      iotReadings,
      alerts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.location.count(),
      prisma.product.count(),
      prisma.stockMovement.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.receiving.count(),
      prisma.receivingItem.count(),
      prisma.auditLog.count(),
      prisma.ioTReading.count(),
      prisma.alert.count(),
    ]);

    counts = {
      users,
      categories,
      locations,
      products,
      stock_movements: stockMovements,
      orders,
      order_items: orderItems,
      receivings,
      receiving_items: receivingItems,
      audit_logs: auditLogs,
      iot_readings: iotReadings,
      alerts,
    };
  } catch (err: any) {
    console.error(
      '❌ Estrutura do banco de dados ausente, inesperada ou incompatível com o schema Prisma atual.'
    );
    console.error(
      '🔒 Operação de seed encerrada por segurança sem realizar qualquer alteração ou limpeza no arquivo SQLite.'
    );
    console.error(`   Detalhe técnico: ${err?.message || err}`);
    process.exit(1);
  }

  const populatedTables = Object.entries(counts).filter(([, count]) => count > 0);
  if (populatedTables.length > 0) {
    const summary = populatedTables.map(([table, count]) => `${table}: ${count}`).join(', ');
    console.log(
      `✅ Banco de dados já possui dados (${summary}). Seed ignorado por segurança para preservar integralmente os registros existentes.`
    );
    console.log(
      '🔒 Nenhuma operação de limpeza ou sobrescrita é permitida sobre um banco de dados populado.'
    );
    return;
  }

  console.log('🌱 Banco de dados vazio confirmado (12 tabelas com 0 registros). Iniciando seed para novo ambiente do LOGISENSE WMS (Campinas - SP)...');

  const isProduction = process.env.NODE_ENV === 'production';
  let adminPassword = 'admin123';
  let gerentePassword = 'gerente123';
  let operadorPassword = 'operador123';
  let consultaPassword = 'consulta123';

  if (isProduction) {
    if (!process.env.INITIAL_ADMIN_PASSWORD && !process.env.DEMO_MODE) {
      console.warn('⚠️  [PRODUÇÃO] INITIAL_ADMIN_PASSWORD não foi informada. Gerando credencial segura interna.');
    }
    adminPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString('base64url');
    gerentePassword = process.env.INITIAL_GERENTE_PASSWORD || crypto.randomBytes(16).toString('base64url');
    operadorPassword = process.env.INITIAL_OPERADOR_PASSWORD || crypto.randomBytes(16).toString('base64url');
    consultaPassword = process.env.INITIAL_CONSULTA_PASSWORD || crypto.randomBytes(16).toString('base64url');

    console.log('🔒 [PRODUÇÃO] Inicialização de senhas seguras executada com hash Bcrypt.');
    console.log('🛡️  Por segurança, nenhuma senha em texto plano é exibida nos logs do servidor.');
  }

  // 1. Criar Usuários (4 perfis RBAC)
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const gerenteHash = await bcrypt.hash(gerentePassword, 10);
  const operadorHash = await bcrypt.hash(operadorPassword, 10);
  const consultaHash = await bcrypt.hash(consultaPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Carlos Eduardo (Admin TI)',
      email: 'admin@logisense.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      department: 'Tecnologia da Informação (TI)',
    },
  });

  const gerente = await prisma.user.create({
    data: {
      name: 'Fernanda Lima (Gerente)',
      email: 'gerente@logisense.com',
      passwordHash: gerenteHash,
      role: 'GERENTE',
      department: 'Administração Logística',
    },
  });

  const operador = await prisma.user.create({
    data: {
      name: 'Marcos Oliveira (Operador)',
      email: 'operador@logisense.com',
      passwordHash: operadorHash,
      role: 'OPERADOR',
      department: 'Estoque e Expedição',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Beatriz Santos (Consulta)',
      email: 'consulta@logisense.com',
      passwordHash: consultaHash,
      role: 'CONSULTA',
      department: 'Atendimento / Comercial',
    },
  });

  console.log('✅ Usuários criados (4 perfis RBAC)');

  // 2. Criar Categorias
  const catEmbalagens = await prisma.category.create({
    data: { name: 'Embalagens & Insumos', description: 'Caixas, filmes stretch, fitas e etiquetas' },
  });
  const catEletro = await prisma.category.create({
    data: { name: 'Eletrônicos & Sensores', description: 'Coletores, sensores RFID e dispositivos IoT' },
  });
  const catEpi = await prisma.category.create({
    data: { name: 'EPI & Segurança', description: 'Equipamentos de proteção individual para armazém' },
  });
  const catPecas = await prisma.category.create({
    data: { name: 'Peças & Componentes', description: 'Componentes industriais e reposição de empilhadeiras' },
  });

  console.log('✅ Categorias criadas');

  // 3. Criar Localizações do Armazém (Endereçamento Físico)
  const locA1 = await prisma.location.create({
    data: { code: 'A-01-01', aisle: 'A', rack: '01', shelf: '01', capacity: 200, status: 'OCCUPIED' },
  });
  const locA2 = await prisma.location.create({
    data: { code: 'A-01-02', aisle: 'A', rack: '01', shelf: '02', capacity: 150, status: 'OCCUPIED' },
  });
  const locA3 = await prisma.location.create({
    data: { code: 'A-02-01', aisle: 'A', rack: '02', shelf: '01', capacity: 150, status: 'AVAILABLE' },
  });
  const locB1 = await prisma.location.create({
    data: { code: 'B-01-01', aisle: 'B', rack: '01', shelf: '01', capacity: 300, status: 'OCCUPIED' },
  });
  const locB2 = await prisma.location.create({
    data: { code: 'B-01-02', aisle: 'B', rack: '01', shelf: '02', capacity: 300, status: 'OCCUPIED' },
  });
  const locC1 = await prisma.location.create({
    data: { code: 'C-01-01', aisle: 'C', rack: '01', shelf: '01', capacity: 100, status: 'OCCUPIED' },
  });
  await prisma.location.create({
    data: { code: 'C-01-02', aisle: 'C', rack: '01', shelf: '02', capacity: 100, status: 'AVAILABLE' },
  });
  await prisma.location.create({
    data: { code: 'D-01-01', aisle: 'D', rack: '01', shelf: '01', capacity: 500, status: 'MAINTENANCE' },
  });

  console.log('✅ Localizações criadas');

  // 4. Criar Produtos
  const p1 = await prisma.product.create({
    data: {
      sku: 'EMB-CX-001',
      name: 'Caixa de Papelão Ondulado Triplo 60x40x40',
      description: 'Caixa reforçada para expedição de cargas fracionadas',
      categoryId: catEmbalagens.id,
      unit: 'UN',
      weight: 0.85,
      dimensions: '60x40x40 cm',
      minStock: 100,
      currentStock: 450,
      locationId: locA1.id,
      status: 'ACTIVE',
    },
  });

  const p2 = await prisma.product.create({
    data: {
      sku: 'EMB-ST-002',
      name: 'Bobina Filme Stretch 500mm x 25 micras',
      description: 'Filme polietileno para unitização de paletes PBR',
      categoryId: catEmbalagens.id,
      unit: 'RL',
      weight: 3.2,
      dimensions: '50x15x15 cm',
      minStock: 30,
      currentStock: 18,
      locationId: locA2.id,
      status: 'ACTIVE',
    },
  });

  const p3 = await prisma.product.create({
    data: {
      sku: 'IOT-SN-003',
      name: 'Sensor Ambiental Temp/Umidade ZigBee v3',
      description: 'Sensor sem fio de telemetria contínua para câmaras e corredores',
      categoryId: catEletro.id,
      unit: 'UN',
      weight: 0.12,
      dimensions: '8x8x3 cm',
      minStock: 15,
      currentStock: 42,
      locationId: locB1.id,
      status: 'ACTIVE',
    },
  });

  const p4 = await prisma.product.create({
    data: {
      sku: 'IOT-RF-004',
      name: 'Etiqueta Passiva RFID UHF Adesiva (Rolo 500 un)',
      description: 'Rastreabilidade automática de lotes em portais de doca',
      categoryId: catEletro.id,
      unit: 'RL',
      weight: 0.6,
      dimensions: '20x20x8 cm',
      minStock: 20,
      currentStock: 8,
      locationId: locB2.id,
      status: 'ACTIVE',
    },
  });

  const p5 = await prisma.product.create({
    data: {
      sku: 'EPI-CP-005',
      name: 'Capacete de Segurança Aba Frontal com Jugular',
      description: 'EPI obrigatório para circulação nas áreas de porta-paletes',
      categoryId: catEpi.id,
      unit: 'UN',
      weight: 0.35,
      dimensions: '28x22x16 cm',
      minStock: 25,
      currentStock: 60,
      locationId: locC1.id,
      status: 'ACTIVE',
    },
  });

  const p6 = await prisma.product.create({
    data: {
      sku: 'EPI-LV-006',
      name: 'Luva de Proteção Tricotada Pigmentada',
      description: 'Proteção mecânica para manuseio de caixas e separação (picking)',
      categoryId: catEpi.id,
      unit: 'PAR',
      weight: 0.08,
      dimensions: '25x12x2 cm',
      minStock: 50,
      currentStock: 120,
      locationId: locC1.id,
      status: 'ACTIVE',
    },
  });

  const p7 = await prisma.product.create({
    data: {
      sku: 'PEC-RD-007',
      name: 'Roda de Poliuretano para Transpaleteira 80x70',
      description: 'Roda de carga de alta resistência à abrasão',
      categoryId: catPecas.id,
      unit: 'UN',
      weight: 1.4,
      dimensions: '8x8x7 cm',
      minStock: 12,
      currentStock: 6,
      locationId: locA3.id,
      status: 'ACTIVE',
    },
  });

  const p8 = await prisma.product.create({
    data: {
      sku: 'IOT-CL-008',
      name: 'Coletor de Dados Óptico 2D Industrial Android',
      description: 'Terminal portátil robusto IP65 para conferência e picking',
      categoryId: catEletro.id,
      unit: 'UN',
      weight: 0.45,
      dimensions: '16x8x3 cm',
      minStock: 10,
      currentStock: 14,
      locationId: locB1.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Produtos criados');

  // 5. Criar Recebimento Inicial
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  await prisma.receiving.create({
    data: {
      receivingNumber: 'REC-2026-0001',
      supplier: 'Klabin Embalagens Industriais S.A.',
      status: 'STORED',
      notes: 'Recebimento conferido e armazenado no corredor A',
      userId: operador.id,
      checkedAt: daysAgo(4),
      checkedBy: operador.name,
      storedAt: daysAgo(4),
      storedBy: operador.name,
      items: {
        create: [
          {
            productId: p1.id,
            expectedQuantity: 150,
            receivedQuantity: 150,
            locationId: locA1.id,
          },
        ],
      },
    },
  });

  // 6. Criar Histórico de Movimentações
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: p1.id,
        type: 'ENTRY',
        quantity: 150,
        userId: operador.id,
        origin: 'Fornecedor Klabin NF-8921',
        destination: 'A-01-01',
        notes: 'Entrada de caixas triplas para operação semanal',
        createdAt: daysAgo(5),
      },
      {
        productId: p3.id,
        type: 'ENTRY',
        quantity: 20,
        userId: gerente.id,
        origin: 'TechIoT Campinas NF-1042',
        destination: 'B-01-01',
        notes: 'Reposição de sensores ZigBee para corredor B',
        createdAt: daysAgo(4),
      },
      {
        productId: p2.id,
        type: 'EXIT',
        quantity: 15,
        userId: operador.id,
        origin: 'A-01-02',
        destination: 'Doca de Expedição 02',
        notes: 'Consumo interno na paletização de pedidos',
        createdAt: daysAgo(3),
      },
      {
        productId: p6.id,
        type: 'ENTRY',
        quantity: 50,
        userId: operador.id,
        origin: 'Protege EPI Ltda NF-3310',
        destination: 'C-01-01',
        notes: 'Lote semestral de luvas pigmentadas',
        createdAt: daysAgo(2),
      },
      {
        productId: p4.id,
        type: 'EXIT',
        quantity: 12,
        userId: operador.id,
        origin: 'B-01-02',
        destination: 'Pedido #PED-2026-002',
        notes: 'Separação para cliente Automação Paulista',
        createdAt: daysAgo(1),
      },
      {
        productId: p1.id,
        type: 'EXIT',
        quantity: 50,
        userId: operador.id,
        origin: 'A-01-01',
        destination: 'Pedido #PED-2026-001',
        notes: 'Expedição concluída na Doca 01',
        createdAt: now,
      },
    ],
  });

  console.log('✅ Movimentações criadas');

  // 7. Criar Pedidos Logísticos
  await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-001',
      customerName: 'Distribuidora Bandeirantes Campinas',
      customer: 'Distribuidora Bandeirantes Campinas',
      status: 'SHIPPED',
      notes: 'Entrega concluída via transportadora Expresso Jundiaí',
      userId: operador.id,
      pickedAt: daysAgo(2),
      pickedBy: operador.name,
      shippedAt: daysAgo(1),
      shippedBy: operador.name,
      items: {
        create: [
          {
            productId: p1.id,
            requestedQuantity: 50,
            pickedQuantity: 50,
            locationId: locA1.id,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-002',
      customerName: 'Automação Industrial Paulista Ltda',
      customer: 'Automação Industrial Paulista Ltda',
      status: 'PICKING',
      notes: 'Prioridade alta - Aguardando conferência final na doca',
      userId: gerente.id,
      items: {
        create: [
          {
            productId: p3.id,
            requestedQuantity: 10,
            pickedQuantity: 10,
            locationId: locB1.id,
          },
          {
            productId: p8.id,
            requestedQuantity: 4,
            pickedQuantity: 2,
            locationId: locB1.id,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-003',
      customerName: ' Metalúrgica Anhanguera S.A.',
      customer: 'Metalúrgica Anhanguera S.A.',
      status: 'PENDING',
      notes: 'Pedido programado para expedição no próximo turno',
      userId: gerente.id,
      items: {
        create: [
          {
            productId: p5.id,
            requestedQuantity: 15,
            pickedQuantity: 0,
            locationId: locC1.id,
          },
          {
            productId: p6.id,
            requestedQuantity: 30,
            pickedQuantity: 0,
            locationId: locC1.id,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-004',
      customerName: 'Centro Logístico Viracopos Hub',
      customer: 'Centro Logístico Viracopos Hub',
      status: 'PICKED',
      notes: 'Conferido e pronto para despacho na doca 03',
      userId: operador.id,
      pickedAt: now,
      pickedBy: operador.name,
      items: {
        create: [
          {
            productId: p1.id,
            requestedQuantity: 25,
            pickedQuantity: 25,
            locationId: locA1.id,
          },
        ],
      },
    },
  });

  console.log('✅ Pedidos criados');

  // 8. Criar Leituras IoT (Simuladas para as Áreas A, B e C)
  await prisma.ioTReading.createMany({
    data: [
      { area: 'Área A', temperature: 22.4, humidity: 54.0, status: 'NORMAL', isSimulated: true },
      { area: 'Área B', temperature: 27.8, humidity: 63.5, status: 'WARNING', isSimulated: true },
      { area: 'Área C', temperature: 21.1, humidity: 49.2, status: 'NORMAL', isSimulated: true },
    ],
  });

  // 9. Criar Alertas Ativos
  await prisma.alert.createMany({
    data: [
      {
        title: 'Estoque Abaixo do Mínimo: Etiqueta RFID UHF',
        message: 'O SKU IOT-RF-004 atingiu 8 RL (mínimo: 20 RL). Providenciar reposição.',
        severity: 'CRITICAL',
        module: 'STOCK',
        area: 'Área B',
        type: 'ESTOQUE_MINIMO',
        status: 'OPEN',
        resolved: false,
      },
      {
        title: 'Estoque Baixo: Bobina Filme Stretch',
        message: 'O SKU EMB-ST-002 está com 18 RL (mínimo: 30 RL).',
        severity: 'HIGH',
        module: 'STOCK',
        area: 'Área A',
        type: 'ESTOQUE_MINIMO',
        status: 'OPEN',
        resolved: false,
      },
      {
        title: 'Temperatura acima do limite na Área B',
        message: 'Temperatura detectada: 31.4 °C (Limite: 30.0 °C)',
        severity: 'HIGH',
        module: 'IOT',
        area: 'Área B',
        type: 'TEMPERATURA',
        detectedValue: 31.4,
        limitValue: 30.0,
        status: 'OPEN',
        resolved: false,
      },
    ],
  });

  // 10. Criar Logs de Auditoria
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_SEED',
      module: 'SYSTEM',
      description: 'Inicialização do banco de dados SQLite local do LOGISENSE WMS concluída',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🚀 Seed do LOGISENSE WMS concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
