import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

/**
 * Listagem de Pedidos com filtros opcionais (status, busca por número ou cliente)
 */
export async function listOrders(req: Request, res: Response): Promise<void> {
  try {
    const { status, search } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (search) {
      const term = String(search).trim();
      where.OR = [
        { orderNumber: { contains: term } },
        { customerName: { contains: term } },
        { customer: { contains: term } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
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
                location: { select: { id: true, code: true } },
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
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ message: 'Erro interno ao listar pedidos' });
  }
}

/**
 * Consulta de Pedido por ID com itens, produtos, localizações e operador
 */
export async function getOrderById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
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
                minStock: true,
                status: true,
                locationId: true,
                location: { select: { id: true, code: true } },
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

    if (!order) {
      res.status(404).json({ message: 'Pedido não encontrado' });
      return;
    }

    res.json({ order });
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    res.status(500).json({ message: 'Erro ao carregar detalhes do pedido' });
  }
}

/**
 * Criação de Novo Pedido (Status inicial: PENDING)
 */
export async function createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { customerName, customer, notes, items } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    const clientName = (customerName || customer || '').trim();
    if (!clientName) {
      res.status(400).json({ message: 'O nome do cliente é obrigatório' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'O pedido deve conter pelo menos 1 item' });
      return;
    }

    // Validar cada item
    const orderItemsData: Array<{
      productId: string;
      requestedQuantity: number;
      pickedQuantity: number;
      locationId?: string | null;
    }> = [];

    for (const item of items) {
      const { productId, requestedQuantity, quantity, locationId } = item;
      const qty = Number(requestedQuantity ?? quantity);

      if (!productId) {
        res.status(400).json({ message: 'Todos os itens devem especificar um produto válido' });
        return;
      }

      if (!qty || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        res.status(400).json({ message: 'A quantidade solicitada deve ser um número inteiro maior que zero' });
        return;
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        res.status(404).json({ message: `Produto com ID ${productId} não encontrado` });
        return;
      }

      if (product.status !== 'ACTIVE') {
        res.status(400).json({
          message: `O produto "${product.name}" (${product.sku}) está inativo e não pode ser incluído no pedido.`,
        });
        return;
      }

      // Validar localização ou usar a localização padrão do produto
      let effectiveLocationId: string | null = null;
      if (locationId) {
        const loc = await prisma.location.findUnique({ where: { id: locationId } });
        if (!loc) {
          res.status(404).json({ message: `Localização ${locationId} informada no item não foi encontrada` });
          return;
        }
        effectiveLocationId = loc.id;
      } else if (product.locationId) {
        effectiveLocationId = product.locationId;
      }

      orderItemsData.push({
        productId,
        requestedQuantity: qty,
        pickedQuantity: 0,
        locationId: effectiveLocationId,
      });
    }

    // Gerar número de pedido sequencial (ex: PED-2026-001)
    const currentYear = new Date().getFullYear();
    const count = await prisma.order.count();
    let seq = count + 1;
    let orderNumber = `PED-${currentYear}-${String(seq).padStart(3, '0')}`;

    // Garantir unicidade do número
    while (await prisma.order.findUnique({ where: { orderNumber } })) {
      seq += 1;
      orderNumber = `PED-${currentYear}-${String(seq).padStart(3, '0')}`;
    }

    // Criar pedido com itens
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: clientName,
        customer: clientName,
        status: 'PENDING',
        notes: notes ? String(notes).trim() : null,
        userId,
        items: {
          create: orderItemsData.map((it) => ({
            productId: it.productId,
            requestedQuantity: it.requestedQuantity,
            pickedQuantity: 0,
            locationId: it.locationId,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: { select: { sku: true, name: true, unit: true, currentStock: true } },
            location: { select: { code: true } },
          },
        },
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ORDER_CREATE',
        module: 'ORDER',
        description: `Novo pedido ${order.orderNumber} criado para "${clientName}" com ${orderItemsData.length} itens.`,
      },
    });

    res.status(201).json({
      message: 'Pedido criado com sucesso!',
      order,
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ message: 'Erro interno ao criar pedido' });
  }
}

/**
 * Adicionar item a pedido pendente
 */
export async function addOrderItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { productId, requestedQuantity, quantity, locationId } = req.body;
    const userId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ message: 'Pedido não encontrado' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({
        message: 'Só é possível adicionar itens a pedidos com status PENDENTE',
      });
      return;
    }

    const qty = Number(requestedQuantity ?? quantity);
    if (!qty || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      res.status(400).json({ message: 'A quantidade solicitada deve ser um número inteiro maior que zero' });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ message: 'Produto não encontrado' });
      return;
    }

    if (product.status !== 'ACTIVE') {
      res.status(400).json({
        message: `O produto "${product.name}" (${product.sku}) está inativo e não pode ser incluído no pedido.`,
      });
      return;
    }

    let effectiveLocationId: string | null = null;
    if (locationId) {
      const loc = await prisma.location.findUnique({ where: { id: locationId } });
      if (!loc) {
        res.status(404).json({ message: 'Localização informada não encontrada' });
        return;
      }
      effectiveLocationId = loc.id;
    } else if (product.locationId) {
      effectiveLocationId = product.locationId;
    }

    const newItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId,
        requestedQuantity: qty,
        pickedQuantity: 0,
        locationId: effectiveLocationId,
      },
      include: {
        product: { select: { sku: true, name: true, unit: true } },
        location: { select: { code: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ORDER_ITEM_ADD',
        module: 'ORDER',
        description: `Item adicionado ao pedido ${order.orderNumber}: ${qty}x ${product.name}`,
      },
    });

    res.status(201).json({
      message: 'Item adicionado ao pedido com sucesso!',
      item: newItem,
    });
  } catch (error) {
    console.error('Erro ao adicionar item ao pedido:', error);
    res.status(500).json({ message: 'Erro interno ao adicionar item' });
  }
}

/**
 * Iniciar Separação (PICKING): Transição PENDING -> PICKING
 */
export async function startPicking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Operador';

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ message: 'Pedido não encontrado' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({
        message: `Não é possível iniciar separação a partir do status "${order.status}". O pedido deve estar PENDENTE.`,
      });
      return;
    }

    if (order.items.length === 0) {
      res.status(400).json({
        message: 'O pedido não possui itens cadastrados para separação.',
      });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'PICKING',
      },
      include: {
        items: {
          include: {
            product: { select: { sku: true, name: true, unit: true, currentStock: true } },
            location: { select: { code: true } },
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ORDER_PICKING_START',
        module: 'ORDER',
        description: `Iniciada separação (picking) do pedido ${order.orderNumber} por ${userName}`,
      },
    });

    res.json({
      message: 'Separação de itens (picking) iniciada com sucesso!',
      order: updated,
    });
  } catch (error) {
    console.error('Erro ao iniciar separação:', error);
    res.status(500).json({ message: 'Erro interno ao iniciar separação' });
  }
}

/**
 * Conferência de Picking: Transição PICKING -> PICKED
 * Registra quantidades separadas de cada item. Não altera saldo de estoque ainda.
 */
export async function pickOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Operador';

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Pedido não encontrado' });
      return;
    }

    if (order.status !== 'PICKING') {
      res.status(400).json({
        message: `A conferência de separação só pode ser realizada para pedidos com status PICKING. Status atual: "${order.status}".`,
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Nenhum item informado para conferência de separação' });
      return;
    }

    // Validar quantidades separadas
    for (const item of items) {
      const pickedQty = Number(item.pickedQuantity);
      if (isNaN(pickedQty) || pickedQty < 0 || !Number.isInteger(pickedQty)) {
        res.status(400).json({
          message: 'A quantidade separada deve ser um número inteiro maior ou igual a zero (valores negativos são proibidos).',
        });
        return;
      }
    }

    // Atualizar cada item em transação atômica
    const operations: any[] = [];
    for (const item of items) {
      const existingItem = order.items.find((it) => it.id === item.id);
      if (!existingItem) {
        res.status(400).json({ message: `Item de ID ${item.id} não pertence a este pedido` });
        return;
      }

      const updateData: any = {
        pickedQuantity: Number(item.pickedQuantity),
      };
      if (item.locationId) {
        updateData.locationId = item.locationId;
      }

      operations.push(
        prisma.orderItem.update({
          where: { id: item.id },
          data: updateData,
        })
      );
    }

    // Atualizar status do pedido para PICKED
    operations.push(
      prisma.order.update({
        where: { id },
        data: {
          status: 'PICKED',
          pickedAt: new Date(),
          pickedBy: userName,
        },
      })
    );

    // Gravar log de auditoria
    operations.push(
      prisma.auditLog.create({
        data: {
          userId,
          action: 'ORDER_PICK',
          module: 'ORDER',
          description: `Conferência de separação (picking) concluída para o pedido ${order.orderNumber} por ${userName}`,
        },
      })
    );

    await prisma.$transaction(operations);

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { sku: true, name: true, unit: true, currentStock: true } },
            location: { select: { code: true } },
          },
        },
      },
    });

    res.json({
      message: 'Conferência de separação (picking) registrada com sucesso! Pedido pronto para expedição.',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Erro ao registrar conferência de separação:', error);
    res.status(500).json({ message: 'Erro interno ao registrar conferência de separação' });
  }
}

/**
 * Expedição e Baixa de Estoque: Transição PICKED -> SHIPPED
 * Executa em transação atômica prisma.$transaction:
 * 1. Valida se produtos estão ativos
 * 2. Valida saldo de estoque (currentStock >= pickedQuantity)
 * 3. Aborta toda a transação se faltar estoque em qualquer item
 * 4. Deduz saldo físico
 * 5. Cria StockMovement (EXIT, origin = local de separação, destination = 'EXPEDIÇÃO')
 * 6. Cria AuditLog para cada baixa
 * 7. Atualiza Order para SHIPPED
 */
export async function shipOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Expedição';

    if (!userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: { location: true },
            },
            location: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Pedido não encontrado' });
      return;
    }

    if (order.status !== 'PICKED') {
      res.status(400).json({
        message: `Apenas pedidos com separação concluída (status CONFERIDO / PICKED) podem ser expedidos. Status atual: "${order.status}".`,
      });
      return;
    }

    if (order.items.length === 0) {
      res.status(400).json({ message: 'Pedido sem itens para expedição' });
      return;
    }

    // Verificar se todos os itens têm quantidade separada = 0
    const totalPicked = order.items.reduce((acc, it) => acc + (it.pickedQuantity || 0), 0);
    if (totalPicked === 0) {
      res.status(400).json({
        message: 'Não é possível expedir o pedido pois nenhum item foi fisicamente separado (quantidade separada = 0 para todos os itens).',
      });
      return;
    }

    // Validações pré-transação para produtos e saldo de estoque
    for (const item of order.items) {
      if (item.pickedQuantity > 0) {
        if (item.product.status !== 'ACTIVE') {
          res.status(400).json({
            message: `O produto "${item.product.name}" (${item.product.sku}) está inativo e não pode ser expedido.`,
          });
          return;
        }

        if (item.product.currentStock < item.pickedQuantity) {
          res.status(400).json({
            message: `Estoque insuficiente para o produto "${item.product.name}" (${item.product.sku}). Saldo disponível: ${item.product.currentStock} ${item.product.unit}, Quantidade a expedir: ${item.pickedQuantity} ${item.product.unit}. Expedição cancelada.`,
          });
          return;
        }
      }
    }

    // Montar operações da transação atômica
    const transactionOperations: any[] = [];
    let itemsShippedCount = 0;

    for (const item of order.items) {
      if (item.pickedQuantity > 0) {
        itemsShippedCount++;
        // Determinar localização física de onde saiu o item
        const effectiveLocationCode = item.location?.code || item.product.location?.code || 'PADRÃO';

        // 1. Atualizar saldo do produto (decremento atômico)
        transactionOperations.push(
          prisma.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                decrement: item.pickedQuantity,
              },
            },
          })
        );

        // 2. Registrar movimentação de saída
        transactionOperations.push(
          prisma.stockMovement.create({
            data: {
              productId: item.productId,
              userId,
              type: 'EXIT',
              quantity: item.pickedQuantity,
              origin: effectiveLocationCode,
              destination: 'EXPEDIÇÃO',
              notes: `Expedição do pedido ${order.orderNumber} - Cliente: ${order.customerName || order.customer || 'Cliente'}`,
            },
          })
        );

        // 3. Registrar auditoria de saída
        transactionOperations.push(
          prisma.auditLog.create({
            data: {
              userId,
              action: 'STOCK_EXIT',
              module: 'STOCK',
              description: `Saída por expedição #${order.orderNumber}: -${item.pickedQuantity} ${item.product.unit} de ${item.product.name} (Origem: ${effectiveLocationCode} -> Destino: EXPEDIÇÃO)`,
            },
          })
        );
      }
    }

    // 4. Atualizar status do pedido para SHIPPED
    transactionOperations.push(
      prisma.order.update({
        where: { id },
        data: {
          status: 'SHIPPED',
          shippedAt: new Date(),
          shippedBy: userName,
        },
      })
    );

    // 5. Auditoria de expedição do pedido
    transactionOperations.push(
      prisma.auditLog.create({
        data: {
          userId,
          action: 'ORDER_SHIPPED',
          module: 'ORDER',
          description: `Pedido ${order.orderNumber} expedido com sucesso para "${order.customerName || order.customer}". Total de ${itemsShippedCount} itens e ${totalPicked} unidades despachadas por ${userName}.`,
        },
      })
    );

    // Executar transação atômica no Prisma
    await prisma.$transaction(transactionOperations);

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { sku: true, name: true, unit: true, currentStock: true } },
            location: { select: { code: true } },
          },
        },
      },
    });

    res.json({
      message: `Pedido ${order.orderNumber} expedido com sucesso! Baixa de estoque efetuada para ${totalPicked} unidades.`,
      order: updatedOrder,
      totalPicked,
      itemsShipped: itemsShippedCount,
    });
  } catch (error: any) {
    console.error('Erro ao expedir pedido:', error);
    res.status(500).json({
      message: error.message || 'Erro interno ao processar expedição do pedido',
    });
  }
}

/**
 * Cancelamento de Pedido
 * Permitido apenas antes da expedição (PENDING, PICKING, PICKED).
 * Pedidos SHIPPED não podem ser cancelados.
 */
export async function cancelOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Usuário';

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      res.status(404).json({ message: 'Pedido não encontrado' });
      return;
    }

    if (order.status === 'SHIPPED') {
      res.status(400).json({
        message: 'Não é possível cancelar um pedido que já foi expedido com baixa de estoque.',
      });
      return;
    }

    if (order.status === 'CANCELLED') {
      res.status(400).json({
        message: 'Este pedido já se encontra cancelado.',
      });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ORDER_CANCEL',
        module: 'ORDER',
        description: `Pedido ${order.orderNumber} cancelado por ${userName} (Status anterior: ${order.status})`,
      },
    });

    res.json({
      message: `Pedido ${order.orderNumber} cancelado com sucesso!`,
      order: updated,
    });
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    res.status(500).json({ message: 'Erro interno ao cancelar pedido' });
  }
}
