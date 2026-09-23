import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

export async function listStock(req: Request, res: Response): Promise<void> {
  try {
    const { categoryId, status, search } = req.query;

    const where: any = {};
    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = String(categoryId);
    }
    if (search) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term } },
        { sku: { contains: term } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        location: true,
        movements: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, type: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const items = products.map((p) => {
      let stockStatus = 'NORMAL';
      if (p.currentStock === 0) {
        stockStatus = 'SEM_ESTOQUE';
      } else if (p.currentStock <= p.minStock) {
        stockStatus = 'ESTOQUE_BAIXO';
      }

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        categoryId: p.categoryId,
        quantity: p.currentStock,
        minStock: p.minStock,
        unit: p.unit,
        location: p.location ? p.location.code : 'Não alocado',
        locationId: p.locationId,
        productStatus: p.status, // ACTIVE / INACTIVE
        status: stockStatus, // NORMAL, ESTOQUE_BAIXO, SEM_ESTOQUE
        lastMovement: p.movements[0]?.createdAt || p.createdAt,
      };
    });

    const filtered = status && status !== 'ALL'
      ? items.filter((item) => item.status === status)
      : items;

    res.json({ stock: filtered });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar estoque' });
  }
}

export async function listMovements(req: Request, res: Response): Promise<void> {
  try {
    const { type, limit, productId } = req.query;

    const where: any = {};
    if (type && type !== 'ALL') {
      where.type = String(type);
    }
    if (productId) {
      where.productId = String(productId);
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      take: limit ? parseInt(String(limit), 10) : 100,
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true, currentStock: true } },
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ movements });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar histórico de movimentações' });
  }
}

export async function registerMovement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { productId, type, quantity, notes, origin, destination } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Usuário não autenticado' });
      return;
    }

    // 1. Validação do Produto
    if (!productId) {
      res.status(400).json({ message: 'O produto é obrigatório para registrar movimentação' });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, location: true },
    });

    if (!product) {
      res.status(404).json({ message: 'Produto não encontrado no sistema' });
      return;
    }

    // REGRA 1: PRODUTO INATIVO NÃO PODE RECEBER MOVIMENTAÇÕES
    if (product.status === 'INACTIVE') {
      res.status(400).json({
        message: `O produto "${product.name}" (SKU: ${product.sku}) está inativo e não pode receber movimentações de estoque. Ative o produto antes de movimentá-lo.`,
      });
      return;
    }

    // 2. Validação do Tipo
    const movementType = String(type).toUpperCase();
    if (!['ENTRY', 'EXIT'].includes(movementType)) {
      res.status(400).json({ message: 'Tipo de movimentação inválido. Deve ser ENTRY (Entrada) ou EXIT (Saída)' });
      return;
    }

    // REGRA 2: QUANTIDADE OBRIGATORIAMENTE MAIOR QUE ZERO
    const parsedQty = parseInt(String(quantity), 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      res.status(400).json({ message: 'A quantidade movimentada deve ser um número inteiro positivo maior que zero' });
      return;
    }

    // REGRA 3: NUNCA PERMITIR ESTOQUE NEGATIVO (Para Saída)
    if (movementType === 'EXIT') {
      if (product.currentStock < parsedQty) {
        res.status(400).json({
          message: `Estoque insuficiente! O produto "${product.name}" possui saldo de ${product.currentStock} ${product.unit}, mas foi solicitada uma saída de ${parsedQty} ${product.unit}.`,
        });
        return;
      }
    }

    // REGRA 4: TRANSAÇÃO ATÔMICA
    const newStock = movementType === 'ENTRY'
      ? product.currentStock + parsedQty
      : product.currentStock - parsedQty;

    const actionText = movementType === 'ENTRY' ? 'Entrada' : 'Saída';
    const auditAction = movementType === 'ENTRY' ? 'STOCK_ENTRY' : 'STOCK_EXIT';

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId,
          type: movementType,
          quantity: parsedQty,
          userId,
          origin: origin || (movementType === 'ENTRY' ? 'Recebimento de Mercadorias' : 'Armazém Central'),
          destination: destination || (movementType === 'ENTRY' ? (product.location?.code || 'Armazém') : 'Expedição / Cliente'),
          notes: notes ? notes.trim() : null,
        },
        include: {
          product: { select: { sku: true, name: true, unit: true } },
          user: { select: { name: true, role: true } },
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: auditAction,
          module: 'STOCK',
          description: `${actionText} de ${parsedQty} ${product.unit} no produto ${product.name} (SKU: ${product.sku}). Saldo anterior: ${product.currentStock}, novo saldo: ${newStock}.`,
        },
      }),
    ]);

    res.status(201).json({
      message: `${actionText} de estoque registrada com sucesso!`,
      product: updatedProduct,
      movement,
      previousStock: product.currentStock,
      newStock,
    });
  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    res.status(500).json({ message: 'Erro interno ao processar movimentação de estoque' });
  }
}

// Aliases para compatibilidade
export async function registerEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  req.body.type = 'ENTRY';
  return registerMovement(req, res);
}

export async function registerExit(req: AuthenticatedRequest, res: Response): Promise<void> {
  req.body.type = 'EXIT';
  return registerMovement(req, res);
}
