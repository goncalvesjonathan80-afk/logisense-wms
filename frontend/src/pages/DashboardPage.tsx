import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Truck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { DashboardData } from '../types';
import { KpiCard } from '../components/KpiCard';
import { MovementsChart } from '../components/MovementsChart';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { RecentAlerts } from '../components/RecentAlerts';
import { IoTSummaryCard } from '../components/IoTSummaryCard';

export const DashboardPage: React.FC = () => {
  const { user, canAccessRoute } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardStats();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar métricas do dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-4">
      {/* Banner de Operações e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-md border border-slate-200 shadow-none">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight uppercase">
            Centro de Operações do Armazém
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operador: <span className="font-semibold text-slate-700">{user?.name}</span> ({user?.role}) • Armazém Geral (1.500 m²)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          {canAccessRoute('/operacoes/recebimento') && (
            <Link
              to="/operacoes/recebimento"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Novo Recebimento</span>
            </Link>
          )}

          {canAccessRoute('/operacoes/expedicao') && (
            <Link
              to="/operacoes/expedicao"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-sm transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Expedição</span>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchStats}
            className="underline font-semibold hover:text-rose-900 ml-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Grid de KPIs - 6 Cards compactos */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            title="Produtos"
            value={data.cards.totalProducts}
            subtitle="Itens cadastrados"
            icon={Package}
            to={canAccessRoute('/estoque/produtos') ? '/estoque/produtos' : undefined}
            badge={{ text: 'Ativos', variant: 'neutral' }}
          />

          <KpiCard
            title="Estoque Físico"
            value={data.cards.totalStockQuantity}
            subtitle="Unidades totais"
            icon={Boxes}
            to={canAccessRoute('/estoque/saldo') ? '/estoque/saldo' : undefined}
            badge={{
              text: `${data.cards.lowStockCount} crítico(s)`,
              variant: data.cards.lowStockCount > 0 ? 'warning' : 'success',
            }}
          />

          <KpiCard
            title="Entradas Hoje"
            value={`+${data.cards.todayEntries}`}
            subtitle="Recebimento diário"
            icon={ArrowDownLeft}
            to={canAccessRoute('/estoque/movimentacoes') ? '/estoque/movimentacoes' : undefined}
            badge={{ text: 'Hoje', variant: 'success' }}
          />

          <KpiCard
            title="Saídas Hoje"
            value={`-${data.cards.todayExits}`}
            subtitle="Expedição diária"
            icon={ArrowUpRight}
            to={canAccessRoute('/estoque/movimentacoes') ? '/estoque/movimentacoes' : undefined}
            badge={{ text: 'Hoje', variant: 'danger' }}
          />

          <KpiCard
            title="Pedidos Fila"
            value={data.cards.pendingOrdersCount}
            subtitle="Pendente / picking"
            icon={ShoppingCart}
            to={canAccessRoute('/operacoes/pedidos') ? '/operacoes/pedidos' : undefined}
            badge={{ text: 'Fila', variant: 'warning' }}
          />

          <KpiCard
            title="Alertas"
            value={data.cards.activeAlertsCount}
            subtitle="Requerem atenção"
            icon={AlertTriangle}
            to={canAccessRoute('/monitoramento') ? '/monitoramento' : undefined}
            badge={{
              text: data.cards.activeAlertsCount > 0 ? 'Atenção' : 'OK',
              variant: data.cards.activeAlertsCount > 0 ? 'danger' : 'success',
            }}
          />
        </div>
      )}

      {/* Status da Doca e Recebimento */}
      {data && (
        <div className="bg-white p-3 rounded-md border border-slate-200 shadow-none flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-slate-100 text-slate-700 shrink-0 border border-slate-200">
              <Building2 className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">Doca & Recebimento:</span>{' '}
              <span className="text-slate-600">
                {data.cards.pendingReceivingsCount || 0} recebimento(s) em fila de conferência • {data.cards.storedReceivingsToday || 0} carga(s) armazenada(s) hoje
              </span>
            </div>
          </div>
          {canAccessRoute('/operacoes/recebimento') && (
            <Link
              to="/operacoes/recebimento"
              className="font-semibold text-sky-700 hover:text-sky-800 underline text-xs shrink-0"
            >
              Ver Recebimentos &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Gráficos Operacionais */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MovementsChart data={data.charts.movements} />
          <CategoryPieChart data={data.charts.categories} />
        </div>
      )}

      {/* Alertas Recentes & Telemetria IoT */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentAlerts alerts={data.recentAlerts} />
          <IoTSummaryCard readings={data.iotSummary} />
        </div>
      )}
    </div>
  );
};
