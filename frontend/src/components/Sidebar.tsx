import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ArrowRightLeft,
  ArrowDownLeft,
  ShoppingCart,
  CheckSquare,
  Truck,
  Activity,
  FileBarChart,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, canAccessRoute } = useAuth();

  // Função auxiliar para classes do link ativo/inativo (contraste aprimorado WCAG AA)
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-150 active:scale-[0.99] ${
      isActive
        ? 'bg-slate-800/90 text-white font-semibold border-l-2 border-sky-400'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
    }`;

  return (
    <>
      {/* Backdrop Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Container da Sidebar */}
      <aside
        aria-label="Menu lateral principal"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabeçalho da Marca */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800 bg-slate-950">
          <Link
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            title="Ir para o Dashboard"
            aria-label="LOGISENSE Warehouse Management - Ir para o Dashboard"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-sm bg-sky-600 text-white font-bold text-xs tracking-wider">
              WMS
            </div>
            <div>
              <div className="font-bold tracking-tight text-white text-xs leading-none">
                LOGISENSE
              </div>
              <div className="text-[9px] text-slate-300 font-semibold tracking-wider uppercase mt-0.5">
                Warehouse Management
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-slate-300 hover:text-white hover:bg-slate-800 lg:hidden"
            title="Fechar menu"
            aria-label="Fechar menu lateral"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navegação Estruturada por Categorias */}
        <nav
          aria-label="Módulos do sistema"
          className="flex-1 px-3 py-3 space-y-3.5 overflow-y-auto custom-scrollbar"
        >
          {/* 1. VISÃO GERAL */}
          <div>
            <NavLink
              to="/dashboard"
              onClick={onClose}
              className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-sky-400 transition-colors block"
              title="Atalho para Visão Geral / Dashboard"
            >
              Visão Geral
            </NavLink>
            {canAccessRoute('/dashboard') && (
              <NavLink to="/dashboard" onClick={onClose} className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Dashboard</span>
              </NavLink>
            )}
          </div>

          {/* 2. ESTOQUE */}
          <div>
            <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Estoque
            </div>
            <div className="space-y-0.5">
              {canAccessRoute('/estoque/produtos') && (
                <NavLink to="/estoque/produtos" onClick={onClose} className={navLinkClass}>
                  <Package className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Produtos</span>
                </NavLink>
              )}
              {canAccessRoute('/estoque/saldo') && (
                <NavLink to="/estoque/saldo" onClick={onClose} className={navLinkClass}>
                  <Boxes className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Posição de Estoque</span>
                </NavLink>
              )}
              {canAccessRoute('/estoque/movimentacoes') && (
                <NavLink to="/estoque/movimentacoes" onClick={onClose} className={navLinkClass}>
                  <ArrowRightLeft className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Movimentações</span>
                </NavLink>
              )}
            </div>
          </div>

          {/* 3. OPERAÇÕES */}
          <div>
            <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operações
            </div>
            <div className="space-y-0.5">
              {canAccessRoute('/operacoes/recebimento') && (
                <NavLink to="/operacoes/recebimento" onClick={onClose} className={navLinkClass}>
                  <ArrowDownLeft className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Recebimentos</span>
                </NavLink>
              )}
              {canAccessRoute('/operacoes/pedidos') && (
                <NavLink to="/operacoes/pedidos" onClick={onClose} className={navLinkClass}>
                  <ShoppingCart className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Pedidos</span>
                </NavLink>
              )}
              {canAccessRoute('/operacoes/picking') && (
                <NavLink to="/operacoes/picking" onClick={onClose} className={navLinkClass}>
                  <CheckSquare className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Picking</span>
                </NavLink>
              )}
              {canAccessRoute('/operacoes/expedicao') && (
                <NavLink to="/operacoes/expedicao" onClick={onClose} className={navLinkClass}>
                  <Truck className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Expedição</span>
                </NavLink>
              )}
            </div>
          </div>

          {/* 4. MONITORAMENTO */}
          <div>
            <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Monitoramento
            </div>
            {canAccessRoute('/monitoramento') && (
              <NavLink to="/monitoramento" onClick={onClose} className={navLinkClass}>
                <Activity className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Ambiente / IoT</span>
              </NavLink>
            )}
          </div>

          {/* 5. RELATÓRIOS */}
          <div>
            <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Relatórios
            </div>
            {canAccessRoute('/relatorios') && (
              <NavLink to="/relatorios" onClick={onClose} className={navLinkClass}>
                <FileBarChart className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Relatórios</span>
              </NavLink>
            )}
          </div>
        </nav>

        {/* Rodapé da Sidebar - Usuário, Perfil & Status Operacional */}
        {user && (
          <div className="p-3 border-t border-slate-800 bg-slate-950 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                  {user.role}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Sair do sistema"
                aria-label="Sair do sistema"
                className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-slate-800 rounded-sm transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium pt-2 border-t border-slate-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
              <span>Sistema operacional</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
