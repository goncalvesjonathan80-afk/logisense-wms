import { Request, Response } from 'express';
import { prisma } from '../database/prisma';

export async function listLocations(_req: Request, res: Response): Promise<void> {
  try {
    const locations = await prisma.location.findMany({
      include: {
        products: {
          select: { id: true, sku: true, name: true, currentStock: true },
        },
      },
      orderBy: [{ aisle: 'asc' }, { rack: 'asc' }, { shelf: 'asc' }],
    });

    res.json({ locations });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar localizações do armazém' });
  }
}
