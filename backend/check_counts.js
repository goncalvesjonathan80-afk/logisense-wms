const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const [users, products, categories, locations, receivings, movements, orders, auditLogs] = await Promise.all([
    p.user.count(),
    p.product.count(),
    p.category.count(),
    p.location.count(),
    p.receiving.count(),
    p.stockMovement.count(),
    p.order.count(),
    p.auditLog.count()
  ]);
  console.log(JSON.stringify({ users, products, categories, locations, receivings, movements, orders, auditLogs }, null, 2));
}

main().finally(() => p.$disconnect());
