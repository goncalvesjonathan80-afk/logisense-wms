import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

export async function listReceivings(req: Request, res: Response): Promise<void> {
  try {
    const { status, search } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (search) {
      const term = String(search).trim();
      where.OR = [
        { receivingNumber: { contains: term } },
        { supplier: { contains: term } },
      ];
    }

    const receivings = await prisma.receiving.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ receivings });
  } catch (error) {
    console.error('Erro ao listar recebimentos:', error);
    res.status(500).json({ message: 'Erro ao listar recebimentos de mercadorias' });
  }
}

export async function getReceivingById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const receiving = await prisma.receiving.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, role: true, department: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                currentStock: true,
                status: true,
              },
            },
            location: {
              select: {
                id: true,
                code: true,
                aisle: true,
                rack: true,
                shelf: true,
              },
            },
          },
        },
      },
    });

    if (!receiving) {
      res.status(404).json({ message: 'Recebimento não encontrado' });
      return;
    }

    res.json({ receiving });
  } catch (error) {
    console.error('Erro ao buscar detalhes do recebimento:', error);
    res.status(500).json({ message: 'Erro ao carregar detalhes do recebimento' });
  }
}

export async function createReceiving(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { supplier, notes, items } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    if (!supplier || !supplier.trim()) {
      res.status(400).json({ message: 'O nome do fornecedor é obrigatório' });
      return;
    }

    // Gerar número de recebimento sequencial (ex: REC-2026-001)
    const count = await prisma.receiving.count();
    const currentYear = new Date().getFullYear();
    const receivingNumber = `REC-${currentYear}-${String(count + 1).padStart(3, '0')}`;

    // Validar itens se fornecidos
    const itemsData: Array<{
      productId: string;
      expectedQuantity: number;
      receivedQuantity: number;
      locationId?: string;
    }> = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.productId) {
          res.status(400).json({ message: 'Todos os itens devem possuir um produto selecionado' });
          return;
        }

        const expectedQty = parseInt(String(item.expectedQuantity), 10);
        if (isNaN(expectedQty) || expectedQty <= 0) {
          res.status(400).json({ message: 'A quantidade esperada de cada item deve ser maior que zero' });
          return;
        }

        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          res.status(400).json({ message: `Produto ${item.productId} não encontrado` });
          return;
        }

        itemsData.push({
          productId: item.productId,
          expectedQuantity: expectedQty,
          receivedQuantity: 0,
          locationId: item.locationId || product.locationId || undefined,
        });
      }
    }

    const [newReceiving] = await prisma.$transaction([
      prisma.receiving.create({
        data: {
          receivingNumber,
          supplier: supplier.trim(),
          notes: notes ? notes.trim() : null,
          status: 'PENDING',
          userId,
          items: itemsData.length > 0 ? { create: itemsData } : undefined,
        },
        include: {
          items: {
            include: {
              product: true,
              location: true,
            },
          },
          user: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'RECEIVING_CREATE',
          module: 'RECEIVING',
          description: `Novo recebimento criado: ${receivingNumber} (Fornecedor: ${supplier.trim()}) com ${itemsData.length} itens`,
        },
      }),
    ]);

    res.status(201).json({
      message: 'Recebimento criado com sucesso!',
      receiving: newReceiving,
    });
  } catch (error) {
    console.error('Erro ao criar recebimento:', error);
    res.status(500).json({ message: 'Erro interno ao criar recebimento' });
  }
}

export async function addReceivingItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { productId, expectedQuantity, locationId } = req.body;

    const receiving = await prisma.receiving.findUnique({
      where: { id },
    });

    if (!receiving) {
      res.status(404).json({ message: 'Recebimento não encontrado' });
      return;
    }

    if (!['PENDING', 'CHECKING'].includes(receiving.status)) {
      res.status(400).json({
        message: `Não é possível adicionar itens a um recebimento com status ${receiving.status}`,
      });
      return;
    }

    if (!productId) {
      res.status(400).json({ message: 'O produto é obrigatório' });
      return;
    }

    const expectedQty = parseInt(String(expectedQuantity), 10);
    if (isNaN(expectedQty) || expectedQty <= 0) {
      res.status(400).json({ message: 'A quantidade esperada deve ser maior que zero' });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({ message: 'Produto não encontrado' });
      return;
    }

    const item = await prisma.receivingItem.create({
      data: {
        receivingId: id,
        productId,
        expectedQuantity: expectedQty,
        receivedQuantity: 0,
        locationId: locationId || product.locationId || null,
      },
      include: {
        product: true,
        location: true,
      },
    });

    res.status(201).json({
      message: 'Item adicionado ao recebimento com sucesso!',
      item,
    });
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    res.status(500).json({ message: 'Erro ao adicionar item ao recebimento' });
  }
}

export async function startChecking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const receiving = await prisma.receiving.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });

    if (!receiving) {
      res.status(404).json({ message: 'Recebimento não encontrado' });
      return;
    }

    if (receiving.status !== 'PENDING') {
      res.status(400).json({
        message: `Apenas recebimentos com status PENDENTE podem iniciar conferência. Status atual: ${receiving.status}`,
      });
      return;
    }

    if (receiving._count.items === 0) {
      res.status(400).json({
        message: 'Adicione pelo menos um item ao recebimento antes de iniciar a conferência',
      });
      return;
    }

    const updated = await prisma.receiving.update({
      where: { id },
      data: { status: 'CHECKING' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RECEIVING_CHECK_START',
        module: 'RECEIVING',
        description: `Início de conferência do recebimento ${receiving.receivingNumber}`,
      },
    });

    res.json({
      message: 'Conferência iniciada com sucesso!',
      receiving: updated,
    });
  } catch (error) {
    console.error('Erro ao iniciar conferência:', error);
    res.status(500).json({ message: 'Erro ao iniciar conferência do recebimento' });
  }
}

export async function checkReceiving(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Operador';

    const receiving = await prisma.receiving.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!receiving) {
      res.status(404).json({ message: 'Recebimento não encontrado' });
      return;
    }

    if (!['PENDING', 'CHECKING'].includes(receiving.status)) {
      res.status(400).json({
        message: `Não é possível conferir um recebimento com status ${receiving.status}. Deve estar PENDENTE ou EM CONFERÊNCIA.`,
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Informe a lista de itens conferidos' });
      return;
    }

    // Validar quantidades recebidas
    for (const it of items) {
      const receivedQty = parseInt(String(it.receivedQuantity), 10);
      if (isNaN(receivedQty) || receivedQty < 0) {
        res.status(400).json({
          message: 'A quantidade recebida não pode ser negativa. Deve ser igual ou maior que zero.',
        });
        return;
      }
    }

    // Atualizar cada item conferido dentro de uma transação
    const updates = items.map((it: { id: string; receivedQuantity: number; locationId?: string }) => {
      const receivedQty = parseInt(String(it.receivedQuantity), 10);
      return prisma.receivingItem.update({
        where: { id: it.id },
        data: {
          receivedQuantity: receivedQty,
          locationId: it.locationId ? it.locationId : undefined,
        },
      });
    });

    await prisma.$transaction([
      ...updates,
      prisma.receiving.update({
        where: { id },
        data: {
          status: 'CHECKED',
          checkedAt: new Date(),
          checkedBy: userName,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'RECEIVING_CHECK',
          module: 'RECEIVING',
          description: `Conferência concluída para o recebimento ${receiving.receivingNumber} por ${userName}`,
        },
      }),
    ]);

    const updatedReceiving = await prisma.receiving.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, location: true } },
        user: true,
      },
    });

    res.json({
      message: 'Conferência de recebimento registrada com sucesso! Status alterado para CONFERIDO.',
      receiving: updatedReceiving,
    });
  } catch (error) {
    console.error('Erro na conferência:', error);
    res.status(500).json({ message: 'Erro interno ao realizar conferência do recebimento' });
  }
}

export async function storeReceiving(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Operador';

    if (!userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    const receiving = await prisma.receiving.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            location: true,
          },
        },
      },
    });

    if (!receiving) {
      res.status(404).json({ message: 'Recebimento não encontrado' });
      return;
    }

    // REGRA 1: Não permitir armazenagem antes de CHECKED
    if (receiving.status !== 'CHECKED') {
      if (receiving.status === 'STORED') {
        res.status(400).json({
          message: `O recebimento ${receiving.receivingNumber} já foi armazenado anteriormente e não pode ser armazenado novamente.`,
        });
        return;
      }
      res.status(400).json({
        message: `Não é permitido armazenar recebimento sem conferência prévia. Status atual: ${receiving.status}. Realize a conferência primeiro.`,
      });
      return;
    }

    if (receiving.items.length === 0) {
      res.status(400).json({ message: 'O recebimento não possui itens para armazenar' });
      return;
    }

    // REGRA 2: Validações de cada item
    // - Localização obrigatória para armazenagem de itens com receivedQuantity > 0
    // - Produto não pode estar INACTIVE
    for (const item of receiving.items) {
      if (item.receivedQuantity > 0) {
        if (!item.locationId || !item.location) {
          res.status(400).json({
            message: `O item "${item.product.name}" não possui localização de destino definida. Todos os itens a armazenar devem ter uma localização válida.`,
          });
          return;
        }

        if (item.product.status === 'INACTIVE') {
          res.status(400).json({
            message: `O produto "${item.product.name}" (SKU: ${item.product.sku}) está inativo e não pode receber entradas no estoque.`,
          });
          return;
        }
      }
    }

    // REGRA 3: Transação Atômica do Prisma
    // - Itens com receivedQuantity > 0 incrementam estoque, atualizam localização do produto e geram StockMovement ENTRY
    // - Itens com receivedQuantity = 0 não geram entrada no estoque (divergência física real preservada)
    const transactionOperations: any[] = [];
    let totalItemsStored = 0;
    let totalUnitsStored = 0;

    for (const item of receiving.items) {
      if (item.receivedQuantity > 0) {
        totalItemsStored++;
        totalUnitsStored += item.receivedQuantity;

        const newCurrentStock = item.product.currentStock + item.receivedQuantity;

        // Atualizar saldo do produto e alocação padrão
        transactionOperations.push(
          prisma.product.update({
            where: { id: item.productId },
            data: {
              currentStock: newCurrentStock,
              locationId: item.locationId,
            },
          })
        );

        // Criar registro de movimentação de ENTRADA
        transactionOperations.push(
          prisma.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'ENTRY',
              quantity: item.receivedQuantity,
              userId,
              origin: `Fornecedor: ${receiving.supplier}`,
              destination: item.location!.code,
              notes: `Recebimento #${receiving.receivingNumber} - Armazenagem confirmada`,
            },
          })
        );

        // Criar log de auditoria de estoque
        transactionOperations.push(
          prisma.auditLog.create({
            data: {
              userId,
              action: 'STOCK_ENTRY',
              module: 'STOCK',
              description: `Entrada por recebimento #${receiving.receivingNumber}: +${item.receivedQuantity} ${item.product.unit} em ${item.product.name} (Destino: ${item.location!.code})`,
            },
          })
        );
      }
    }

    // Atualizar o status do recebimento para ARMAZENADO
    transactionOperations.push(
      prisma.receiving.update({
        where: { id },
        data: {
          status: 'STORED',
          storedAt: new Date(),
          storedBy: userName,
        },
      })
    );

    // Gravar log de auditoria no módulo RECEIVING
    transactionOperations.push(
      prisma.auditLog.create({
        data: {
          userId,
          action: 'RECEIVING_STORE',
          module: 'RECEIVING',
          description: `Armazenagem concluída com sucesso para recebimento ${receiving.receivingNumber}: ${totalItemsStored} itens e ${totalUnitsStored} unidades físicas estocadas por ${userName}`,
        },
      })
    );

    // Executar transação atômica
    await prisma.$transaction(transactionOperations);

    const updatedReceiving = await prisma.receiving.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, location: true } },
        user: true,
      },
    });

    res.json({
      message: `Recebimento armazenado com sucesso! ${totalUnitsStored} unidades deram entrada no estoque do armazém.`,
      receiving: updatedReceiving,
      storedUnits: totalUnitsStored,
      storedItems: totalItemsStored,
    });
  } catch (error) {
    console.error('Erro ao armazenar recebimento:', error);
    res.status(500).json({ message: 'Erro interno ao efetivar armazenagem no estoque' });
  }
}

export async function cancelReceiving(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const receiving = await prisma.receiving.findUnique({
      where: { id },
    });

    if (!receiving) {
      res.status(404).json({ message: 'Recebimento não encontrado' });
      return;
    }

    if (receiving.status === 'STORED') {
      res.status(400).json({
        message: 'Não é possível cancelar um recebimento que já foi armazenado no estoque',
      });
      return;
    }

    const updated = await prisma.receiving.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RECEIVING_CANCEL',
        module: 'RECEIVING',
        description: `Cancelamento do recebimento ${receiving.receivingNumber}`,
      },
    });

    res.json({
      message: 'Recebimento cancelado com sucesso!',
      receiving: updated,
    });
  } catch (error) {
    console.error('Erro ao cancelar recebimento:', error);
    res.status(500).json({ message: 'Erro ao cancelar recebimento' });
  }
}
