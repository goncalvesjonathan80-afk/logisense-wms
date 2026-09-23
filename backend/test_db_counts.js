const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DB RECORD COUNTS ===');
  console.log('Users:', await prisma.user.count());
  console.log('Products:', await prisma.product.count());
  console.log('Categories:', await prisma.category.count());
  console.log('Locations:', await prisma.location.count());
  console.log('Receivings:', await prisma.receiving.count());
  console.log('Orders:', await prisma.order.count());
  console.log('Movements:', await prisma.stockMovement.count());
  console.log('IoT Readings:', await prisma.ioTReading.count());
  console.log('Alerts:', await prisma.alert.count());
  console.log('Audit Logs:', await prisma.auditLog.count());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
