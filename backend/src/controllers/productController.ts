import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

export async function listProducts(req: Request, res: Response): Promise<void> {
  try {
    const { search, categoryId, status } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') where.status = String(status);
    if (categoryId && categoryId !== 'ALL') where.categoryId = String(categoryId);
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
        category: { select: { id: true, name: true } },
        location: { select: { id: true, code: true, aisle: true, rack: true, shelf: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar produtos' });
  }
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        movements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!product) {
      res.status(404).json({ message: 'Produto não encontrado' });
      return;
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar detalhes do produto' });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      name,
      sku,
      categoryId,
      unit,
      minStock,
      locationId,
      description,
      weight,
      dimensions,
    } = req.body;

    const userId = req.user?.id;

    // Validações obrigatórias
    if (!name || !name.trim()) {
      res.status(400).json({ message: 'O nome do produto é obrigatório' });
      return;
    }

    if (!sku || !sku.trim()) {
      res.status(400).json({ message: 'O SKU/Código do produto é obrigatório' });
      return;
    }

    if (!categoryId) {
      res.status(400).json({ message: 'A categoria do produto é obrigatória' });
      return;
    }

    if (!unit || !unit.trim()) {
      res.status(400).json({ message: 'A unidade de medida é obrigatória (ex: UN, CX, KG)' });
      return;
    }

    const parsedMinStock = parseInt(String(minStock ?? 0), 10);
    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      res.status(400).json({ message: 'O estoque mínimo não pode ser negativo' });
      return;
    }

    // Verificar unicidade do SKU
    const formattedSku = sku.trim().toUpperCase();
    const existingSku = await prisma.product.findUnique({
      where: { sku: formattedSku },
    });

    if (existingSku) {
      res.status(400).json({ message: `Já existe um produto cadastrado com o SKU ${formattedSku}` });
      return;
    }

    // Verificar se categoria existe
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      res.status(400).json({ message: 'A categoria informada não existe' });
      return;
    }

    // Criar produto e log de auditoria em transação
    const [newProduct] = await prisma.$transaction([
      prisma.product.create({
        data: {
          name: name.trim(),
          sku: formattedSku,
          categoryId,
          unit: unit.trim().toUpperCase(),
          minStock: parsedMinStock,
          currentStock: 0,
          locationId: locationId || null,
          description: description ? description.trim() : null,
          weight: weight ? parseFloat(String(weight)) : null,
          dimensions: dimensions ? dimensions.trim() : null,
          status: 'ACTIVE',
        },
        include: {
          category: true,
          location: true,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          module: 'PRODUCTS',
          description: `Cadastro de novo produto: ${name.trim()} (SKU: ${formattedSku})`,
        },
      }),
    ]);

    res.status(201).json({
      message: 'Produto cadastrado com sucesso!',
      product: newProduct,
    });
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error);
    res.status(500).json({ message: 'Erro interno ao cadastrar produto' });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      name,
      sku,
      categoryId,
      unit,
      minStock,
      locationId,
      description,
      weight,
      dimensions,
    } = req.body;

    const userId = req.user?.id;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      res.status(404).json({ message: 'Produto não encontrado' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'O nome do produto é obrigatório' });
      return;
    }

    if (!sku || !sku.trim()) {
      res.status(400).json({ message: 'O SKU/Código do produto é obrigatório' });
      return;
    }

    if (!categoryId) {
      res.status(400).json({ message: 'A categoria do produto é obrigatória' });
      return;
    }

    if (!unit || !unit.trim()) {
      res.status(400).json({ message: 'A unidade de medida é obrigatória' });
      return;
    }

    const parsedMinStock = parseInt(String(minStock ?? 0), 10);
    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      res.status(400).json({ message: 'O estoque mínimo não pode ser negativo' });
      return;
    }

    const formattedSku = sku.trim().toUpperCase();
    if (formattedSku !== existingProduct.sku) {
      const skuConflict = await prisma.product.findUnique({
        where: { sku: formattedSku },
      });
      if (skuConflict) {
        res.status(400).json({ message: `Já existe um produto com o SKU ${formattedSku}` });
        return;
      }
    }

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: {
          name: name.trim(),
          sku: formattedSku,
          categoryId,
          unit: unit.trim().toUpperCase(),
          minStock: parsedMinStock,
          locationId: locationId || null,
          description: description ? description.trim() : null,
          weight: weight ? parseFloat(String(weight)) : null,
          dimensions: dimensions ? dimensions.trim() : null,
        },
        include: {
          category: true,
          location: true,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          module: 'PRODUCTS',
          description: `Atualização de dados do produto: ${name.trim()} (SKU: ${formattedSku})`,
        },
      }),
    ]);

    res.json({
      message: 'Produto atualizado com sucesso!',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ message: 'Erro interno ao atualizar produto' });
  }
}

export async function toggleProductStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      res.status(404).json({ message: 'Produto não encontrado' });
      return;
    }

    const nextStatus = status ? String(status).toUpperCase() : (existingProduct.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

    if (!['ACTIVE', 'INACTIVE'].includes(nextStatus)) {
      res.status(400).json({ message: 'Status inválido. Deve ser ACTIVE ou INACTIVE' });
      return;
    }

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { status: nextStatus },
        include: { category: true, location: true },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: nextStatus === 'ACTIVE' ? 'ACTIVATE' : 'INACTIVATE',
          module: 'PRODUCTS',
          description: `${nextStatus === 'ACTIVE' ? 'Reativação' : 'Inativação'} do produto ${existingProduct.name} (SKU: ${existingProduct.sku})`,
        },
      }),
    ]);

    res.json({
      message: `Produto ${nextStatus === 'ACTIVE' ? 'ativado' : 'inativado'} com sucesso!`,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Erro ao alternar status do produto:', error);
    res.status(500).json({ message: 'Erro ao alterar status do produto' });
  }
}
