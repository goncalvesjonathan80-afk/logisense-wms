import { Request, Response } from 'express';
import { prisma } from '../database/prisma';

export async function listAuditLogs(_req: Request, res: Response): Promise<void> {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar logs de auditoria' });
  }
}
