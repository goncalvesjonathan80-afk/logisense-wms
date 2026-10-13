import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, LogOut, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  CONSULTA: 'Consulta',
};

const ROUTE_TITLES: Record<string, { category: string; title: string }> = {
  '/dashboard': { category: 'Visão Geral', title: 'Dashboard' },
  '/estoque/produtos': { category: 'Estoque', title: 'Produtos' },
  '/estoque/saldo': { category: 'Estoque', title: 'Saldo Físico' },
  '/estoque/movimentacoes': { category: 'Estoque', title: 'Movimentações' },
  '/operacoes/recebimento': { category: 'Operações', title: 'Recebimentos' },
  '/operacoes/pedidos': { category: 'Operações', title: 'Pedidos' },
  '/operacoes/picking': { category: 'Operações', title: 'Picking (Separação)' },
  '/operacoes/expedicao': { category: 'Operações', title: 'Expedição' },
  '/monitoramento': { category: 'Monitoramento', title: 'IoT / Monitoramento' },
  '/relatorios': { category: 'Relatórios', title: 'Relatórios Operacionais' },
};

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const currentRoute = ROUTE_TITLES[location.pathname] || {
    category: 'Sistema',
    title: 'LOGISENSE WMS',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-white border-b border-slate-200">
      {/* Esquerda: Botão Menu Mobile & Breadcrumb de Navegação */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 text-slate-600 rounded-md hover:bg-slate-100 lg:hidden"
          title="Alternar menu"
          aria-label="Alternar menu lateral"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <nav aria-label="Navegação estruturada" className="flex items-center gap-1.5 text-xs">
          <Link
            to="/dashboard"
            className="font-semibold text-slate-900 tracking-tight hover:text-sky-600 transition-colors"
            title="Ir para o Dashboard"
          >
            LOGISENSE
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span className="text-slate-600 font-medium hidden sm:inline">
            {currentRoute.category}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" aria-hidden="true" />
          <span className="font-semibold text-slate-800" aria-current="page">
            {currentRoute.title}
          </span>
        </nav>
      </div>

      {/* Direita: Perfil do Usuário e Sessão */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-xs font-semibold text-slate-800">
                {user.name}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="text-[11px] text-slate-600">
                  {user.department || 'Operações'}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <Shield className="w-2.5 h-2.5 text-slate-600" aria-hidden="true" />
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="flex items-center justify-center w-7 h-7 rounded-sm bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs tracking-wider"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" aria-hidden="true" />

            <button
              type="button"
              onClick={logout}
              title="Encerrar sessão"
              aria-label="Encerrar sessão e sair do sistema"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-slate-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
