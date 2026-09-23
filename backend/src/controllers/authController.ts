import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { AuthenticatedRequest, AuthUserPayload } from '../middlewares/auth';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.active) {
      res.status(401).json({ message: 'Credenciais inválidas ou usuário inativo' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Credenciais inválidas ou usuário inativo' });
      return;
    }

    const payload: AuthUserPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as any,
      department: user.department,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    // Registrar no log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        module: 'AUTH',
        description: `Usuário ${user.name} efetuou login no sistema`,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno ao realizar login' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        active: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Erro em getMe:', error);
    res.status(500).json({ message: 'Erro ao buscar dados do usuário logado' });
  }
}

export async function getDemoAccounts(_req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        name: true,
        email: true,
        role: true,
        department: true,
      },
      orderBy: { role: 'asc' },
    });

    res.json({
      accounts: users.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        suggestedPassword: `${u.role.toLowerCase()}123`,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar contas de demonstração' });
  }
}
