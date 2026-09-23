import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'GERENTE' | 'OPERADOR' | 'CONSULTA';
  department?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token de autenticação não fornecido ou inválido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Sessão expirada ou token inválido' });
    return;
  }
}

export function requireRole(allowedRoles: Array<'ADMIN' | 'GERENTE' | 'OPERADOR' | 'CONSULTA'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: `Acesso negado. Seu perfil (${req.user.role}) não possui permissão para esta operação.`,
      });
      return;
    }

    next();
  };
}
