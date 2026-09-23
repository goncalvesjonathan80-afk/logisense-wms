import { Request, Response } from 'express';
import { prisma } from '../database/prisma';

/**
 * Utilitário para enviar dados no formato CSV com suporte a UTF-8 (BOM para Excel)
 */
function sendCsvResponse(
  res: Response,
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const csvContent = [
    headers.join(';'),
    ...rows.map((row) =>
      row
        .map((val) => {
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(';')
    ),
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Adiciona BOM UTF-8 para correta abertura de acentos no Excel
  res.send('\uFEFF' + csvContent);
}

/**
 * 1. Relatório de Posição de Estoque
 * Filtros: ?categoryId= & ?status=
 */
export async function getStockReport(req: Request, res: Response): Promise<void> {
  try {
    const { categoryId, status, format } = req.query;

    const where: any = { status: 'ACTIVE' };
    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = String(categoryId);
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        location: { select: { code: true } },
      },
      orderBy: { name: 'asc' },
    });

    let data = products.map((p) => {
      let stockStatus = 'NORMAL';
      if (p.currentStock === 0) stockStatus = 'SEM_ESTOQUE';
      else if (p.currentStock <= p.minStock) stockStatus = 'ESTOQUE_BAIXO';

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        currentStock: p.currentStock,
        minStock: p.minStock,
        unit: p.unit,
        location: p.location?.code || 'PADRÃO',
        status: stockStatus,
      };
    });

    if (status && status !== 'ALL') {
      data = data.filter((d) => d.status === status);
    }

    if (format === 'csv') {
      const headers = [
        'SKU',
        'Produto',
        'Categoria',
        'Estoque Atual',
        'Estoque Mínimo',
        'Unidade',
        'Endereço / Local',
        'Situação',
      ];
      const rows = data.map((d) => [
        d.sku,
        d.name,
        d.category,
        d.currentStock,
        d.minStock,
        d.unit,
        d.location,
        d.status === 'NORMAL'
          ? 'Normal'
          : d.status === 'ESTOQUE_BAIXO'
          ? 'Estoque Baixo'
          : 'Sem Estoque',
      ]);

      sendCsvResponse(res, 'relatorio_estoque_logisense.csv', headers, rows);
      return;
    }

    res.json({ report: data, total: data.length });
  } catch (error) {
    console.error('Erro ao gerar relatório de estoque:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de estoque' });
  }
}

/**
 * 2. Relatório de Movimentações
 * Filtros: ?type= & ?startDate= & ?endDate=
 */
export async function getMovementsReport(req: Request, res: Response): Promise<void> {
  try {
    const { type, startDate, endDate, format } = req.query;

    const where: any = {};
    if (type && type !== 'ALL') {
      where.type = String(type);
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { sku: true, name: true, unit: true } },
        user: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = movements.map((m) => ({
      id: m.id,
      date: m.createdAt,
      type: m.type,
      productName: m.product.name,
      productSku: m.product.sku,
      quantity: m.quantity,
      unit: m.product.unit,
      userName: m.user.name,
      origin: m.origin || '-',
      destination: m.destination || '-',
      notes: m.notes || '-',
    }));

    if (format === 'csv') {
      const headers = [
        'Data/Hora',
        'Tipo',
        'Produto',
        'SKU',
        'Quantidade',
        'Unidade',
        'Operador',
        'Origem',
        'Destino',
        'Observações',
      ];
      const rows = data.map((d) => [
        new Date(d.date).toLocaleString('pt-BR'),
        d.type === 'ENTRY' ? 'Entrada' : 'Saída',
        d.productName,
        d.productSku,
        d.quantity,
        d.unit,
        d.userName,
        d.origin,
        d.destination,
        d.notes,
      ]);

      sendCsvResponse(res, 'relatorio_movimentacoes_logisense.csv', headers, rows);
      return;
    }

    res.json({ report: data, total: data.length });
  } catch (error) {
    console.error('Erro ao gerar relatório de movimentações:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de movimentações' });
  }
}

/**
 * 3. Relatório de Recebimentos
 * Filtros: ?status= & ?startDate= & ?endDate=
 */
export async function getReceivingsReport(req: Request, res: Response): Promise<void> {
  try {
    const { status, startDate, endDate, format } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const receivings = await prisma.receiving.findMany({
      where,
      include: {
        user: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = receivings.map((r) => ({
      id: r.id,
      receivingNumber: r.receivingNumber,
      supplier: r.supplier,
      createdAt: r.createdAt,
      status: r.status,
      totalItems: r.items.length,
      userName: r.user.name,
      checkedBy: r.checkedBy || '-',
      storedAt: r.storedAt,
      storedBy: r.storedBy || '-',
      notes: r.notes || '-',
    }));

    if (format === 'csv') {
      const headers = [
        'Número',
        'Fornecedor',
        'Data Criação',
        'Status',
        'Qtd Itens',
        'Responsável Cadastro',
        'Conferido Por',
        'Armazenado Em',
        'Armazenado Por',
      ];
      const rows = data.map((d) => [
        d.receivingNumber,
        d.supplier,
        new Date(d.createdAt).toLocaleDateString('pt-BR'),
        d.status,
        d.totalItems,
        d.userName,
        d.checkedBy,
        d.storedAt ? new Date(d.storedAt).toLocaleDateString('pt-BR') : '-',
        d.storedBy,
      ]);

      sendCsvResponse(res, 'relatorio_recebimentos_logisense.csv', headers, rows);
      return;
    }

    res.json({ report: data, total: data.length });
  } catch (error) {
    console.error('Erro ao gerar relatório de recebimentos:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de recebimentos' });
  }
}

/**
 * 4. Relatório de Expedições e Pedidos
 * Filtros: ?status= & ?startDate= & ?endDate=
 */
export async function getOrdersReport(req: Request, res: Response): Promise<void> {
  try {
    const { status, startDate, endDate, format } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName || o.customer || 'Cliente Geral',
      createdAt: o.createdAt,
      status: o.status,
      totalItems: o.items.length,
      userName: o.user?.name || 'Sistema',
      pickedBy: o.pickedBy || '-',
      shippedAt: o.shippedAt,
      shippedBy: o.shippedBy || '-',
      notes: o.notes || '-',
    }));

    if (format === 'csv') {
      const headers = [
        'Pedido',
        'Cliente / Destinatário',
        'Data Criação',
        'Status',
        'Qtd Itens',
        'Cadastrado Por',
        'Separado Por (Picking)',
        'Expedido Em',
        'Expedido Por',
      ];
      const rows = data.map((d) => [
        d.orderNumber,
        d.customerName,
        new Date(d.createdAt).toLocaleDateString('pt-BR'),
        d.status,
        d.totalItems,
        d.userName,
        d.pickedBy,
        d.shippedAt ? new Date(d.shippedAt).toLocaleString('pt-BR') : '-',
        d.shippedBy,
      ]);

      sendCsvResponse(res, 'relatorio_expedicoes_logisense.csv', headers, rows);
      return;
    }

    res.json({ report: data, total: data.length });
  } catch (error) {
    console.error('Erro ao gerar relatório de expedições:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de expedições' });
  }
}
