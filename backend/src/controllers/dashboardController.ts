import { Request, Response } from 'express';
import { prisma } from '../database/prisma';

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Contagens principais dos Cards
    const totalProducts = await prisma.product.count({
      where: { status: 'ACTIVE' },
    });

    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { currentStock: true, minStock: true, category: { select: { name: true } } },
    });

    const totalStockQuantity = products.reduce((acc, p) => acc + p.currentStock, 0);
    const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;

    // Entradas e saídas de hoje
    const todayMovements = await prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: today },
      },
      select: { type: true, quantity: true },
    });

    const todayEntries = todayMovements
      .filter((m) => m.type === 'ENTRY')
      .reduce((acc, m) => acc + m.quantity, 0);

    const todayExits = todayMovements
      .filter((m) => m.type === 'EXIT')
      .reduce((acc, m) => acc + m.quantity, 0);

    // Pedidos por estágio de fluxo
    const ordersPending = await prisma.order.count({
      where: { status: 'PENDING' },
    });
    const ordersPicking = await prisma.order.count({
      where: { status: 'PICKING' },
    });
    const ordersPicked = await prisma.order.count({
      where: { status: 'PICKED' },
    });
    const ordersShippedToday = await prisma.order.count({
      where: {
        status: 'SHIPPED',
        shippedAt: { gte: today },
      },
    });
    const pendingOrdersCount = ordersPending + ordersPicking + ordersPicked;

    // Alertas não resolvidos
    const activeAlertsCount = await prisma.alert.count({
      where: { resolved: false },
    });

    // Recebimentos pendentes ou em conferência
    const pendingReceivingsCount = await prisma.receiving.count({
      where: {
        status: { in: ['PENDING', 'CHECKING'] },
      },
    });

    const storedReceivingsToday = await prisma.receiving.count({
      where: {
        status: 'STORED',
        storedAt: { gte: today },
      },
    });

    // 2. Gráfico de movimentações nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentMovements = await prisma.stockMovement.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { type: true, quantity: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por dia (formato DD/MM)
    const dayMap = new Map<string, { date: string; entradas: number; saídas: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      dayMap.set(key, { date: key, entradas: 0, saídas: 0 });
    }

    recentMovements.forEach((m) => {
      const d = new Date(m.createdAt);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (dayMap.has(key)) {
        const item = dayMap.get(key)!;
        if (m.type === 'ENTRY') item.entradas += m.quantity;
        else if (m.type === 'EXIT') item.saídas += m.quantity;
      }
    });

    const movementsChart = Array.from(dayMap.values());

    // 3. Distribuição de estoque por categoria
    const categoryAgg: Record<string, number> = {};
    products.forEach((p) => {
      const catName = p.category.name;
      categoryAgg[catName] = (categoryAgg[catName] || 0) + p.currentStock;
    });

    const categoryChart = Object.entries(categoryAgg).map(([name, total]) => ({
      name,
      total,
    }));

    // 4. Alertas Recentes
    const recentAlerts = await prisma.alert.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
    });

    const activeIoTAlerts = await prisma.alert.findMany({
      where: { module: 'IOT', status: 'OPEN' },
    });
    const activeIoTAlertsCount = activeIoTAlerts.length;
    const areasInAlertCount = new Set(activeIoTAlerts.map((a) => a.area).filter(Boolean)).size;

    // 5. Leituras IoT Simuladas para resumo (Áreas A, B e C)
    const defaultAreas = ['Área A', 'Área B', 'Área C'];
    const iotSummary: any[] = [];
    for (const a of defaultAreas) {
      const r = await prisma.ioTReading.findFirst({
        where: { OR: [{ area: a }, { area: a.replace('Área ', '') }] },
        orderBy: { timestamp: 'desc' },
      });
      if (r) iotSummary.push(r);
    }

    res.json({
      cards: {
        totalProducts,
        totalStockQuantity,
        lowStockCount,
        todayEntries,
        todayExits,
        pendingOrdersCount,
        ordersPending,
        ordersPicking,
        ordersPicked,
        ordersShippedToday,
        activeAlertsCount,
        activeIoTAlertsCount,
        areasInAlertCount,
        pendingReceivingsCount,
        storedReceivingsToday,
      },
      charts: {
        movements: movementsChart,
        categories: categoryChart,
      },
      recentAlerts,
      iotSummary,
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ message: 'Erro ao carregar indicadores do dashboard' });
  }
}
