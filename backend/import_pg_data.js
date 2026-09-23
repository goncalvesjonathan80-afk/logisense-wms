const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData() {
  console.log('================================================================');
  console.log('🚀 INICIANDO MIGRAÇÃO DE DADOS: SNAPSHOT -> POSTGRESQL');
  console.log('================================================================\n');

  const snapshotPath = path.join(__dirname, 'prisma', 'database_snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    throw new Error('Arquivo de snapshot não encontrado: ' + snapshotPath);
  }

  const { data, metadata } = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  console.log('Snapshot carregado com sucesso!');
  console.log('Data da exportação:', metadata.exportedAt);
  console.log('Origem:', metadata.source);

  // Inserção em ordem estrita de chaves estrangeiras
  console.log('\n[1/12] Migrando Usuários (Users)...');
  for (const item of data.users) {
    await prisma.user.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
  }
  console.log(`  -> ${data.users.length} usuários migrados.`);

  console.log('\n[2/12] Migrando Categorias (Categories)...');
  for (const item of data.categories) {
    await prisma.category.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
      },
    });
  }
  console.log(`  -> ${data.categories.length} categorias migradas.`);

  console.log('\n[3/12] Migrando Localizações (Locations)...');
  for (const item of data.locations) {
    await prisma.location.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
      },
    });
  }
  console.log(`  -> ${data.locations.length} localizações migradas.`);

  console.log('\n[4/12] Migrando Produtos (Products)...');
  for (const item of data.products) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
  }
  console.log(`  -> ${data.products.length} produtos migrados.`);

  console.log('\n[5/12] Migrando Movimentações de Estoque (StockMovements)...');
  for (const item of data.stockMovements) {
    await prisma.stockMovement.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
      },
    });
  }
  console.log(`  -> ${data.stockMovements.length} movimentações migradas.`);

  console.log('\n[6/12] Migrando Recebimentos (Receivings)...');
  for (const item of data.receivings) {
    await prisma.receiving.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        checkedAt: item.checkedAt ? new Date(item.checkedAt) : null,
        storedAt: item.storedAt ? new Date(item.storedAt) : null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
  }
  console.log(`  -> ${data.receivings.length} recebimentos migrados.`);

  console.log('\n[7/12] Migrando Itens de Recebimento (ReceivingItems)...');
  for (const item of data.receivingItems) {
    await prisma.receivingItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
  }
  console.log(`  -> ${data.receivingItems.length} itens de recebimento migrados.`);

  console.log('\n[8/12] Migrando Pedidos (Orders)...');
  for (const item of data.orders) {
    await prisma.order.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        pickedAt: item.pickedAt ? new Date(item.pickedAt) : null,
        shippedAt: item.shippedAt ? new Date(item.shippedAt) : null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
  }
  console.log(`  -> ${data.orders.length} pedidos migrados.`);

  console.log('\n[9/12] Migrando Itens de Pedido (OrderItems)...');
  for (const item of data.orderItems) {
    await prisma.orderItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
  }
  console.log(`  -> ${data.orderItems.length} itens de pedido migrados.`);

  console.log('\n[10/12] Migrando Leituras IoT (IoTReadings)...');
  for (const item of data.ioTReadings) {
    await prisma.ioTReading.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        timestamp: new Date(item.timestamp),
      },
    });
  }
  console.log(`  -> ${data.ioTReadings.length} leituras IoT migradas.`);

  console.log('\n[11/12] Migrando Alertas (Alerts)...');
  for (const item of data.alerts) {
    await prisma.alert.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        resolvedAt: item.resolvedAt ? new Date(item.resolvedAt) : null,
        createdAt: new Date(item.createdAt),
      },
    });
  }
  console.log(`  -> ${data.alerts.length} alertas migrados.`);

  console.log('\n[12/12] Migrando Logs de Auditoria (AuditLogs)...');
  for (const item of data.auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        createdAt: new Date(item.createdAt),
      },
    });
  }
  console.log(`  -> ${data.auditLogs.length} logs de auditoria migrados.`);

  console.log('\n================================================================');
  console.log('📊 CONFERÊNCIA DE INTEGRIDADE (COMPARAÇÃO SQLITE vs POSTGRESQL)');
  console.log('================================================================');

  const pgCounts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    locations: await prisma.location.count(),
    products: await prisma.product.count(),
    stockMovements: await prisma.stockMovement.count(),
    receivings: await prisma.receiving.count(),
    receivingItems: await prisma.receivingItem.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    ioTReadings: await prisma.ioTReading.count(),
    alerts: await prisma.alert.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  let allMatch = true;
  for (const [key, originalCount] of Object.entries(metadata.counts)) {
    const pgCount = pgCounts[key];
    const match = originalCount === pgCount;
    if (!match) allMatch = false;
    console.log(`  - ${key.padEnd(16)}: SQLite=${originalCount} | PostgreSQL=${pgCount} | [${match ? 'OK' : 'DIVERGÊNCIA'}]`);
  }

  if (allMatch) {
    console.log('\n🎉 SUCESSO ABSOLUTO! 100% DOS DADOS MIGRADOS COM INTEGRIDADE.');
  } else {
    throw new Error('Houve divergência na contagem de registros pós-migração!');
  }
}

importData()
  .catch((err) => {
    console.error('Erro na migração:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
