import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, getAuthToken, removeAuthToken, setAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  canAccessRoute: (routePath: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Regras de RBAC por rota (alinhadas às permissões do backend)
const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],

  // Operações
  '/operacoes/recebimento': ['ADMIN', 'GERENTE', 'OPERADOR'],
  '/operacoes/armazenagem': ['ADMIN', 'GERENTE', 'OPERADOR'],
  '/operacoes/pedidos': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],
  '/operacoes/picking': ['ADMIN', 'GERENTE', 'OPERADOR'],
  '/operacoes/expedicao': ['ADMIN', 'GERENTE', 'OPERADOR'],
  '/operacoes/iot': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],

  // Estoque
  '/estoque/produtos': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],
  '/estoque/saldo': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],
  '/estoque/movimentacoes': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],
  '/estoque/localizacoes': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],
  '/estoque/inventario': ['ADMIN', 'GERENTE'],

  // Outros módulos
  '/pedidos': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],
  '/monitoramento': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],
  '/relatorios': ['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA'],
  '/usuarios': ['ADMIN'],
  '/auditoria': ['ADMIN'],
  '/configuracoes': ['ADMIN'],
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setIsLoading(false);
        setUser(null);
        setToken(null);
        return;
      }

      try {
        const { user } = await api.getMe();
        setUser(user);
        setToken(storedToken);
      } catch (error) {
        console.warn('Sessão expirada ou inválida:', error);
        removeAuthToken();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    // Sincronização em tempo real entre abas via StorageEvent
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'logisense_token') {
        if (!e.newValue) {
          // Logout executado em outra aba
          setUser(null);
          setToken(null);
        } else {
          // Login/troca de sessão executada em outra aba
          loadUser();
        }
      }
    };

    // Sincronização imediata na mesma aba caso uma requisição retorne HTTP 401
    const handleUnauthorized = () => {
      removeAuthToken();
      setUser(null);
      setToken(null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('logisense:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('logisense:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const demoLogin = async (role: UserRole) => {
    const data = await api.demoLogin(role);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setToken(null);
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const canAccessRoute = (routePath: string): boolean => {
    if (!user) return false;
    const allowed = ROUTE_PERMISSIONS[routePath];
    if (!allowed) return true; // Rotas sem restrição específica
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        demoLogin,
        logout,
        hasRole,
        canAccessRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
