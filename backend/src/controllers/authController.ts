import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { AuthenticatedRequest, AuthUserPayload } from '../middlewares/auth';

// Proteção contra força bruta no endpoint de login (Rate Limit em memória por IP + e-mail)
interface LoginAttemptTracker {
  failedAttempts: number;
  firstFailedAt: number;
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_FAILED_ATTEMPTS = 10;
const loginAttemptsMap = new Map<string, LoginAttemptTracker>();

function getRateLimitKey(req: Request, email?: string): string {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : 'unknown';
  return `${ip}:${normalizedEmail}`;
}

function isRateLimited(key: string): boolean {
  const entry = loginAttemptsMap.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstFailedAt > LOGIN_WINDOW_MS) {
    loginAttemptsMap.delete(key);
    return false;
  }
  return entry.failedAttempts >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = loginAttemptsMap.get(key);
  if (!entry || now - entry.firstFailedAt > LOGIN_WINDOW_MS) {
    loginAttemptsMap.set(key, { failedAttempts: 1, firstFailedAt: now });
  } else {
    entry.failedAttempts += 1;
  }
}

function clearFailedAttempts(key: string): void {
  loginAttemptsMap.delete(key);
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
      return;
    }

    const rateKey = getRateLimitKey(req, email);
    if (isRateLimited(rateKey)) {
      res.status(429).json({
        message: 'Muitas tentativas de login malsucedidas. Aguarde alguns minutos antes de tentar novamente.',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.active) {
      recordFailedAttempt(rateKey);
      res.status(401).json({ message: 'Credenciais inválidas ou usuário inativo' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      recordFailedAttempt(rateKey);
      res.status(401).json({ message: 'Credenciais inválidas ou usuário inativo' });
      return;
    }

    clearFailedAttempts(rateKey);

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

export async function demoLogin(req: Request, res: Response): Promise<void> {
  try {
    // Permitido em desenvolvimento local OU em produção exclusivamente se DEMO_MODE=true
    const isAllowed = !config.isProduction || config.isDemoMode;
    if (!isAllowed) {
      res.status(403).json({
        message: 'Acesso demonstrativo desativado neste ambiente por políticas de segurança.',
      });
      return;
    }

    const { role } = req.body;
    const allowedRoles = ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'];

    if (!role || typeof role !== 'string' || !allowedRoles.includes(role.toUpperCase())) {
      res.status(400).json({ message: 'Perfil demonstrativo inválido.' });
      return;
    }

    // Rate Limiting no demo login por IP
    const rateKey = `demo:${req.ip || req.socket.remoteAddress || '127.0.0.1'}`;
    if (isRateLimited(rateKey)) {
      res.status(429).json({
        message: 'Muitas tentativas de acesso demonstrativo. Aguarde alguns instantes.',
      });
      return;
    }

    const targetRole = role.toUpperCase();
    const user = await prisma.user.findFirst({
      where: { role: targetRole, active: true },
    });

    if (!user) {
      recordFailedAttempt(rateKey);
      res.status(404).json({ message: `Conta demonstrativa para o perfil ${targetRole} não encontrada.` });
      return;
    }

    clearFailedAttempts(rateKey);

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
        action: 'DEMO_LOGIN',
        module: 'AUTH',
        description: `Acesso demonstrativo acadêmico realizado no perfil ${user.role} (${user.name})`,
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
    console.error('Erro no demoLogin:', error);
    res.status(500).json({ message: 'Erro ao processar autenticação demonstrativa.' });
  }
}

export async function getDemoAccounts(_req: Request, res: Response): Promise<void> {
  try {
    const isAllowed = !config.isProduction || config.isDemoMode;
    if (!isAllowed) {
      res.json({ accounts: [], demoMode: false });
      return;
    }

    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        name: true,
        email: true,
        role: true,
        department: true,
      },
      orderBy: { role: 'asc' },
    });

    res.json({
      demoMode: true,
      accounts: users.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        suggestedPassword: config.isProduction ? undefined : `${u.role.toLowerCase()}123`,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar contas de demonstração' });
  }
}
