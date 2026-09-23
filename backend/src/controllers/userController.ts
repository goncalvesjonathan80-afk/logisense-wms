import { Request, Response } from 'express';
import { prisma } from '../database/prisma';

export async function listUsers(_req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
}
