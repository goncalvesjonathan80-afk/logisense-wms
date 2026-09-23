const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
  console.log('--- INICIANDO EXPORTAÇÃO COMPLETA DO SQLITE (dev.db) ---');
  
  const users = await prisma.user.findMany();
  const categories = await prisma.category.findMany();
  const locations = await prisma.location.findMany();
  const products = await prisma.product.findMany();
  const stockMovements = await prisma.stockMovement.findMany();
  const receivings = await prisma.receiving.findMany();
  const receivingItems = await prisma.receivingItem.findMany();
  const orders = await prisma.order.findMany();
  const orderItems = await prisma.orderItem.findMany();
  const ioTReadings = await prisma.ioTReading.findMany();
  const alerts = await prisma.alert.findMany();
  const auditLogs = await prisma.auditLog.findMany();

  const snapshot = {
    metadata: {
      exportedAt: new Date().toISOString(),
      source: 'SQLite (backend/prisma/dev.db)',
      counts: {
        users: users.length,
        categories: categories.length,
        locations: locations.length,
        products: products.length,
        stockMovements: stockMovements.length,
        receivings: receivings.length,
        receivingItems: receivingItems.length,
        orders: orders.length,
        orderItems: orderItems.length,
        ioTReadings: ioTReadings.length,
        alerts: alerts.length,
        auditLogs: auditLogs.length,
      }
    },
    data: {
      users,
      categories,
      locations,
      products,
      stockMovements,
      receivings,
      receivingItems,
      orders,
      orderItems,
      ioTReadings,
      alerts,
      auditLogs,
    }
  };

  const outputPath = path.join(__dirname, 'prisma', 'database_snapshot.json');
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log('✅ Exportação concluída com sucesso!');
  console.log('Arquivo salvo em:', outputPath);
  console.log('Contagens exportadas:', JSON.stringify(snapshot.metadata.counts, null, 2));
}

exportData()
  .catch((err) => {
    console.error('Erro na exportação:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
