import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do LOGISENSE WMS...');

  // Limpar dados existentes em ordem reversa de dependência
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.ioTReading.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Banco de dados limpo.');

  // 1. Criar Usuários com hash de senha
  const passwordAdmin = await bcrypt.hash('admin123', 10);
  const passwordGerente = await bcrypt.hash('gerente123', 10);
  const passwordOperador = await bcrypt.hash('operador123', 10);
  const passwordConsulta = await bcrypt.hash('consulta123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Carlos Mendes (Admin)',
      email: 'admin@logisense.com',
      passwordHash: passwordAdmin,
      role: 'ADMIN',
      department: 'TI & Governança',
      active: true,
    },
  });

  const gerente = await prisma.user.create({
    data: {
      name: 'Mariana Duarte (Gerente)',
      email: 'gerente@logisense.com',
      passwordHash: passwordGerente,
      role: 'GERENTE',
      department: 'Operações Logísticas',
      active: true,
    },
  });

  const operador = await prisma.user.create({
    data: {
      name: 'João Silva (Operador)',
      email: 'operador@logisense.com',
      passwordHash: passwordOperador,
      role: 'OPERADOR',
      department: 'Armazém & Expedição',
      active: true,
    },
  });

  const consulta = await prisma.user.create({
    data: {
      name: 'Ana Paula (Consulta)',
      email: 'consulta@logisense.com',
      passwordHash: passwordConsulta,
      role: 'CONSULTA',
      department: 'Auditoria Acadêmica',
      active: true,
    },
  });

  console.log('✅ Usuários criados (Admin, Gerente, Operador, Consulta).');

  // 2. Categorias
  const catEmbalagens = await prisma.category.create({
    data: { name: 'Embalagens & Acondicionamento', description: 'Caixas de papelão, fitas, filmes e paletes' },
  });
  const catMateriasPrimas = await prisma.category.create({
    data: { name: 'Matérias-Primas', description: 'Insumos industriais e componentes base' },
  });
  const catEletronicos = await prisma.category.create({
    data: { name: 'Eletrônicos & IoT', description: 'Sensores, coletores e dispositivos de rede' },
  });
  const catQuimicos = await prisma.category.create({
    data: { name: 'Suprimentos & Manutenção', description: 'Materiais de proteção e suprimentos operacionais' },
  });

  console.log('✅ Categorias criadas.');

  // 3. Localizações do armazém (1.500 m² - Corredores A e B)
  const locA0101 = await prisma.location.create({
    data: { code: 'A-01-01', aisle: 'A', rack: '01', shelf: '01', capacity: 150, status: 'OCCUPIED' },
  });
  const locA0102 = await prisma.location.create({
    data: { code: 'A-01-02', aisle: 'A', rack: '01', shelf: '02', capacity: 120, status: 'OCCUPIED' },
  });
  const locA0103 = await prisma.location.create({
    data: { code: 'A-01-03', aisle: 'A', rack: '01', shelf: '03', capacity: 100, status: 'AVAILABLE' },
  });
  const locA0201 = await prisma.location.create({
    data: { code: 'A-02-01', aisle: 'A', rack: '02', shelf: '01', capacity: 200, status: 'OCCUPIED' },
  });
  const locA0202 = await prisma.location.create({
    data: { code: 'A-02-02', aisle: 'A', rack: '02', shelf: '02', capacity: 80, status: 'OCCUPIED' },
  });
  const locB0101 = await prisma.location.create({
    data: { code: 'B-01-01', aisle: 'B', rack: '01', shelf: '01', capacity: 50, status: 'OCCUPIED' },
  });
  const locB0102 = await prisma.location.create({
    data: { code: 'B-01-02', aisle: 'B', rack: '01', shelf: '02', capacity: 50, status: 'AVAILABLE' },
  });
  const locB0201 = await prisma.location.create({
    data: { code: 'B-02-01', aisle: 'B', rack: '02', shelf: '01', capacity: 300, status: 'OCCUPIED' },
  });

  console.log('✅ Localizações de armazém cadastradas.');

  // 4. Produtos
  const prodPalete = await prisma.product.create({
    data: {
      sku: 'EMB-PAL-001',
      name: 'Palete PBR Madeira Tratada 1000x1200mm',
      description: 'Palete padrão brasileiro homologado para estantes porta-paletes',
      categoryId: catEmbalagens.id,
      unit: 'UN',
      weight: 22.5,
      dimensions: '120x100x14 cm',
      minStock: 30,
      currentStock: 85,
      locationId: locA0101.id,
      status: 'ACTIVE',
    },
  });

  const prodCaixa = await prisma.product.create({
    data: {
      sku: 'EMB-CX-040',
      name: 'Caixa Papelão Kraft Triplex 40x30x25cm',
      description: 'Caixa resistente para expedição de mercadorias pesadas',
      categoryId: catEmbalagens.id,
      unit: 'CX',
      weight: 0.45,
      dimensions: '40x30x25 cm',
      minStock: 100,
      currentStock: 340,
      locationId: locA0102.id,
      status: 'ACTIVE',
    },
  });

  const prodStretch = await prisma.product.create({
    data: {
      sku: 'EMB-STR-500',
      name: 'Bobina Filme Stretch Manual 500mm x 25 micras',
      description: 'Filme para paletização e consolidação de cargas',
      categoryId: catEmbalagens.id,
      unit: 'UN',
      weight: 3.2,
      dimensions: '50x12x12 cm',
      minStock: 25,
      currentStock: 64,
      locationId: locA0201.id,
      status: 'ACTIVE',
    },
  });

  const prodFita = await prisma.product.create({
    data: {
      sku: 'EMB-FIT-048',
      name: 'Fita Adesiva Hot Melt Transparente 48mm x 100m',
      description: 'Fita adesiva de alta aderência para fechamento de caixas',
      categoryId: catEmbalagens.id,
      unit: 'UN',
      weight: 0.22,
      dimensions: '12x12x4.8 cm',
      minStock: 50,
      currentStock: 12, // Estoque baixo para gerar alerta!
      locationId: locA0202.id,
      status: 'ACTIVE',
    },
  });

  const prodSensor = await prisma.product.create({
    data: {
      sku: 'IOT-SEN-002',
      name: 'Sensor de Temperatura e Umidade IoT LoRaWAN',
      description: 'Sensor industrial alimentado por bateria com alcance de até 3 km',
      categoryId: catEletronicos.id,
      unit: 'UN',
      weight: 0.18,
      dimensions: '10x7x3 cm',
      minStock: 5,
      currentStock: 18,
      locationId: locB0101.id,
      status: 'ACTIVE',
    },
  });

  const prodLuva = await prisma.product.create({
    data: {
      sku: 'SUP-LUV-009',
      name: 'Luva de Proteção Nitrílica Antiderrapante (Tamanho G)',
      description: 'EPI para operadores no manuseio de caixas e carga',
      categoryId: catQuimicos.id,
      unit: 'PC',
      weight: 0.08,
      dimensions: '25x12x2 cm',
      minStock: 40,
      currentStock: 120,
      locationId: locB0201.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Produtos cadastrados.');

  // 5. Histórico de Movimentações (Entradas e Saídas ao longo dos últimos dias)
  const now = new Date();
  const d1 = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const d2 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const d3 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const d4 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  await prisma.stockMovement.createMany({
    data: [
      {
        productId: prodPalete.id,
        type: 'ENTRY',
        quantity: 50,
        userId: operador.id,
        origin: 'Madeireira Campineira Ltda',
        destination: 'A-01-01',
        notes: 'Recebimento de lote com NF 45891',
        createdAt: d1,
      },
      {
        productId: prodCaixa.id,
        type: 'ENTRY',
        quantity: 200,
        userId: operador.id,
        origin: 'Klabin Embalagens',
        destination: 'A-01-02',
        notes: 'Reposição programada',
        createdAt: d2,
      },
      {
        productId: prodCaixa.id,
        type: 'EXIT',
        quantity: 60,
        userId: operador.id,
        origin: 'A-01-02',
        destination: 'Expedição - Pedido PED-2026-004',
        notes: 'Separação de carga',
        createdAt: d3,
      },
      {
        productId: prodStretch.id,
        type: 'ENTRY',
        quantity: 30,
        userId: operador.id,
        origin: 'PlasticFlex Indústria',
        destination: 'A-02-01',
        notes: 'Recebimento NF 8921',
        createdAt: d3,
      },
      {
        productId: prodStretch.id,
        type: 'EXIT',
        quantity: 10,
        userId: operador.id,
        origin: 'A-02-01',
        destination: 'Linha de Paletização',
        notes: 'Consumo interno operacional',
        createdAt: d4,
      },
      {
        productId: prodPalete.id,
        type: 'EXIT',
        quantity: 15,
        userId: operador.id,
        origin: 'A-01-01',
        destination: 'Expedição Cliente TechLog',
        notes: 'Carregamento doca 2',
        createdAt: now,
      },
      {
        productId: prodLuva.id,
        type: 'ENTRY',
        quantity: 50,
        userId: gerente.id,
        origin: 'Fornecedor EPI Campinas',
        destination: 'B-02-01',
        notes: 'Suprimento almoxarifado',
        createdAt: now,
      },
    ],
  });

  console.log('✅ Movimentações de estoque registradas.');

  // 6. Pedidos
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-001',
      customer: 'TechLog Soluções Campinas',
      customerName: 'TechLog Soluções Campinas',
      status: 'PENDING',
      notes: 'Carregamento prioritário na doca 1',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      { orderId: order1.id, productId: prodPalete.id, quantity: 10, price: 65.0 },
      { orderId: order1.id, productId: prodCaixa.id, quantity: 50, price: 4.8 },
    ],
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-002',
      customer: 'Distribuidora Metropolitana SP',
      customerName: 'Distribuidora Metropolitana SP',
      status: 'PICKING',
      notes: 'Coleta agendada para 16:00',
    },
  });

  await prisma.orderItem.create({
    data: { orderId: order2.id, productId: prodStretch.id, quantity: 8, price: 42.0 },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-003',
      customer: 'Sigma Indústria & Comércio',
      customerName: 'Sigma Indústria & Comércio',
      status: 'READY',
      notes: 'Aguardando transportadora',
    },
  });

  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-004',
      customer: 'Varejo Santos Logística',
      customerName: 'Varejo Santos Logística',
      status: 'SHIPPED',
      notes: 'Despachado via transportadora parceira',
    },
  });

  console.log('✅ Pedidos e itens cadastrados.');

  // 7. Leituras IoT Simuladas (Áreas A, B e C)
  await prisma.ioTReading.createMany({
    data: [
      {
        area: 'Área A (Armazenagem Seca)',
        temperature: 23.4,
        humidity: 54.0,
        status: 'NORMAL',
        isSimulated: true,
      },
      {
        area: 'Área B (Almoxarifado & Químicos)',
        temperature: 27.8,
        humidity: 61.0,
        status: 'WARNING',
        isSimulated: true,
      },
      {
        area: 'Área C (Expedição & Docas)',
        temperature: 22.1,
        humidity: 50.0,
        status: 'NORMAL',
        isSimulated: true,
      },
    ],
  });

  console.log('✅ Dados simulados de IoT registrados.');

  // 8. Alertas
  await prisma.alert.createMany({
    data: [
      {
        title: 'Estoque Baixo',
        message: 'O produto "Fita Adesiva Hot Melt 48mm" atingiu 12 unidades (mínimo: 50).',
        severity: 'HIGH',
        module: 'STOCK',
        resolved: false,
      },
      {
        title: 'Temperatura Elevada - Área B',
        message: 'Área B registrou 27,8 °C (limite operacional recomendado: 26,0 °C).',
        severity: 'MEDIUM',
        module: 'IOT',
        resolved: false,
      },
      {
        title: 'Pedido com Prioridade Alta',
        message: 'Pedido PED-2026-001 aguardando início de separação.',
        severity: 'LOW',
        module: 'ORDER',
        resolved: false,
      },
    ],
  });

  console.log('✅ Alertas operacionais registrados.');

  // 9. Logs de Auditoria
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'SYSTEM_INIT',
        module: 'AUTH',
        description: 'Inicialização do banco de dados e carga de dados de demonstração (PIM III)',
      },
      {
        userId: gerente.id,
        action: 'STOCK_ENTRY',
        module: 'STOCK',
        description: 'Registro de entrada inicial de estoque para lote de embalagens',
      },
    ],
  });

  console.log('✅ Logs de auditoria inicializados.');
  console.log('🎉 Seed do LOGISENSE WMS concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
