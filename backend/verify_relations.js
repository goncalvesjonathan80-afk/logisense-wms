const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('=== VERIFICAÇÃO DE INTEGRIDADE RELACIONAL NO POSTGRESQL ===');
  
  // 1. Produto -> Categoria e Localização
  const p = await prisma.product.findFirst({
    include: { category: true, location: true },
  });
  console.log(`✅ Produto: "${p.name}" (SKU: ${p.sku}) -> Categoria: "${p.category?.name}" | Localização: "${p.location?.code}"`);

  // 2. Pedido -> Itens -> Produto
  const o = await prisma.order.findFirst({
    where: { items: { some: {} } },
    include: { items: { include: { product: true } } },
  });
  console.log(`✅ Pedido: "${o.orderNumber}" -> Total Itens: ${o.items.length} | Primeiro Item: "${o.items[0]?.product?.name}"`);

  // 3. Recebimento -> Itens -> Produto
  const r = await prisma.receiving.findFirst({
    where: { items: { some: {} } },
    include: { items: { include: { product: true } } },
  });
  console.log(`✅ Recebimento: "${r.receivingNumber}" -> Total Itens: ${r.items.length} | Primeiro Item: "${r.items[0]?.product?.name}"`);

  // 4. Movimentação de Estoque -> Produto e Usuário
  const m = await prisma.stockMovement.findFirst({
    include: { product: true, user: true },
  });
  console.log(`✅ Movimentação: Tipo "${m.type}" (${m.quantity} un) -> Produto: "${m.product?.name}" | Usuário: "${m.user?.name}"`);

  // 5. Alerta e Telemetria
  const alert = await prisma.alert.findFirst();
  console.log(`✅ Alerta: "${alert.title}" (Severidade: ${alert.severity}, Área: ${alert.area})`);

  // 6. Usuário ADMIN
  const admin = await prisma.user.findUnique({ where: { email: 'admin@logisense.com' } });
  console.log(`✅ Usuário Admin: "${admin.name}" (Role: ${admin.role})`);
}

check()
  .catch((e) => {
    console.error('Erro na validação relacional:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
