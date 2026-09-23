import { Request, Response } from 'express';
import { prisma } from '../database/prisma';

export async function listCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { products: true } },
      },
    });

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar categorias' });
  }
}
