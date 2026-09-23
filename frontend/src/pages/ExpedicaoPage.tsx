import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  PackageCheck,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  ArrowRight,
  MapPin,
  Clock,
  Boxes,
  CheckSquare,
  AlertTriangle,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Order, OrderStatus } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: 'Aguardando Separação',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
  PICKING: {
    label: 'Em Separação',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  PICKED: {
    label: 'Pronto p/ Expedição',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  SHIPPED: {
    label: 'Expedido',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  CANCELLED: {
    label: 'Cancelado',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export const ExpedicaoPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canOperate = hasRole(['ADMIN', 'GERENTE', 'OPERADOR']);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PICKED' | 'SHIPPED' | 'ALL'>('PICKED');

  // Modal de Expedição / Detalhes
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Carregar dados
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      let statusParam: string | undefined = undefined;
      if (statusFilter === 'PICKED') statusParam = 'PICKED';
      else if (statusFilter === 'SHIPPED') statusParam = 'SHIPPED';

      const res = await api.getOrders({
        status: statusParam,
        search: searchTerm || undefined,
      });

      setOrders(res.orders || []);

      if (selectedOrder) {
        const updated = await api.getOrderById(selectedOrder.id);
        if (updated?.order) setSelectedOrder(updated.order);
      }
    } catch (err: any) {
      console.error('Erro ao carregar lista de expedição:', err);
      setError(err.message || 'Erro ao carregar pedidos para expedição.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, searchTerm]);

  // Contadores
  const countReady = orders.filter((o) => o.status === 'PICKED').length;
  const countShipped = orders.filter((o) => o.status === 'SHIPPED').length;

  // Confirmar Expedição
  const handleShipOrder = async (orderId: string) => {
    if (!window.confirm('Confirmar a expedição deste pedido? Os itens separados serão baixados do estoque imediatamente de forma atômica.')) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      const res = await api.shipOrder(orderId);
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 6000);

      const updated = await api.getOrderById(orderId);
      setSelectedOrder(updated.order);
      await loadOrders();
    } catch (err: any) {
      setActionError(err.message || 'Erro ao processar expedição do pedido.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Expedição e Saída de Mercadorias"
        subtitle="Conferência final de carga, despacho ao cliente e baixa física atômica no estoque do armazém"
        icon={Truck}
        actions={
          <>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
              title="Atualizar listagem"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              to="/operacoes/picking"
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
            >
              Ir para Picking
            </Link>
          </>
        }
      />

      {/* Alerta de Baixa Atômica */}
      <div className="p-2.5 bg-sky-50 border border-sky-300 rounded-md text-xs text-sky-950 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-sky-700 flex-shrink-0" />
          <span>
            <strong>Regra de Integridade:</strong> A baixa física de estoque ocorre <strong>exclusivamente nesta tela de Expedição</strong> através de transação atômica. Se algum item apresentar saldo insuficiente, a operação é rejeitada.
          </span>
        </div>
      </div>

      {/* Mensagens de Sucesso ou Erro */}
      {successMessage && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-between text-emerald-900 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-md flex items-center justify-between text-rose-900 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white p-3 rounded-md border border-slate-200 shadow-none flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número do pedido ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-500 placeholder-slate-400"
          />
        </div>

        {/* Abas Rápidas de Status */}
        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('PICKED')}
            className={`px-2.5 py-1 rounded-sm font-semibold transition-colors ${
              statusFilter === 'PICKED'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Prontos para Expedição (PICKED)
          </button>
          <button
            onClick={() => setStatusFilter('SHIPPED')}
            className={`px-2.5 py-1 rounded-sm font-semibold transition-colors ${
              statusFilter === 'SHIPPED'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Histórico de Expedidos (SHIPPED)
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-sm font-semibold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos os Pedidos
          </button>
        </div>
      </div>

      {/* Tabela de Pedidos para Expedição */}
      <div className="bg-white rounded-md border border-slate-200 shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-3 py-2.5">Número do Pedido</th>
                <th className="px-3 py-2.5">Cliente / Destinatário</th>
                <th className="px-3 py-2.5 text-center">Itens / Qtd</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Responsável</th>
                <th className="px-3 py-2.5 text-right">Ação de Expedição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-slate-600" />
                    Carregando fila de expedição...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    <Truck className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                    <p className="font-semibold text-slate-700">Nenhum pedido nesta etapa</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {statusFilter === 'PICKED'
                        ? 'Não há pedidos conferidos aguardando despacho.'
                        : 'Altere o filtro de status para ver outros registros.'}
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  const totalPickedUnits = order.items
                    ? order.items.reduce((acc, it) => acc + (it.pickedQuantity || 0), 0)
                    : 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-slate-900 block">
                          {order.customerName || order.customer || 'Cliente'}
                        </span>
                        {order.notes && (
                          <span className="text-[11px] text-slate-500 truncate max-w-xs block font-sans">
                            {order.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="font-medium text-slate-800">
                          {order.items ? order.items.length : order._count?.items ?? 0} item(ns)
                        </div>
                        {order.status === 'PICKED' || order.status === 'SHIPPED' ? (
                          <span className="text-[10px] text-sky-800 font-mono">
                            {totalPickedUnits} un separadas
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {order.status === 'SHIPPED'
                          ? order.shippedBy || 'Expedição'
                          : order.pickedBy
                          ? `Separado por ${order.pickedBy}`
                          : order.user?.name || 'Sistema'}
                      </td>
                      <td className="px-3 py-2.5 text-right space-x-1.5">
                        {order.status === 'PICKED' && canOperate && (
                          <button
                            onClick={() => {
                              setActionError(null);
                              setSelectedOrder(order);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded-sm shadow-none transition-colors"
                          >
                            <Truck className="w-3.5 h-3.5 text-sky-400" />
                            <span>Despachar & Baixar</span>
                          </button>
                        )}

                        {order.status === 'SHIPPED' && (
                          <button
                            onClick={() => {
                              setActionError(null);
                              setSelectedOrder(order);
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Ver Comprovante</span>
                          </button>
                        )}

                        {order.status !== 'PICKED' && order.status !== 'SHIPPED' && (
                          <button
                            onClick={() => {
                              setActionError(null);
                              setSelectedOrder(order);
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Detalhes</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between font-medium">
          <span>Total na fila: {orders.length} pedidos</span>
          <span className="text-slate-500">Armazém Central LogiSense</span>
        </div>
      </div>

      {/* MODAL: REVISÃO & DESPACHO DE EXPEDIÇÃO */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-none overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-md shadow-2xl border border-slate-300 overflow-hidden my-6">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-100">
              <div className="flex items-center space-x-2 text-slate-800">
                <Truck className="w-4 h-4 text-slate-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Expedição de Pedido — <span className="font-mono">{selectedOrder.orderNumber}</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-600">
                      Cliente / Destinatário: <strong>{selectedOrder.customerName || selectedOrder.customer}</strong>
                    </p>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-3">
              {actionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-sm text-xs text-rose-900 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {selectedOrder.status === 'PICKED' ? (
                <div className="p-2.5 bg-sky-50 border border-sky-300 rounded-sm text-xs text-sky-950">
                  <span className="font-semibold block mb-0.5">Validação Pré-Expedição:</span>
                  Confira abaixo os itens que foram separados fisicamente. Ao confirmar, o sistema realizará a baixa definitiva e atômica de estoque de cada item.
                </div>
              ) : selectedOrder.status === 'SHIPPED' ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-sm text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-xs">
                    <PackageCheck className="w-4 h-4 text-emerald-700" />
                    <span>Pedido Despachado com Sucesso</span>
                  </div>
                  <p className="text-slate-700">
                    Expedido por <strong>{selectedOrder.shippedBy || 'Expedição'}</strong> em{' '}
                    {selectedOrder.shippedAt
                      ? new Date(selectedOrder.shippedAt).toLocaleString('pt-BR')
                      : 'Data registrada'}
                    . As baixas de estoque foram devidamente registradas.
                  </p>
                </div>
              ) : null}

              {/* Tabela de Itens a Expedir */}
              <div className="border border-slate-200 rounded-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Produto / SKU</th>
                      <th className="px-3 py-2">Origem da Saída</th>
                      <th className="px-3 py-2 text-center">Qtd Solicitada</th>
                      <th className="px-3 py-2 text-center">Qtd a Expedir</th>
                      <th className="px-3 py-2 text-center">Saldo em Estoque</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((item) => {
                      const hasStock = item.product.currentStock >= item.pickedQuantity;
                      const isZero = item.pickedQuantity === 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">
                            <div>{item.product.name}</div>
                            <div className="text-slate-500 font-mono text-[11px]">
                              {item.product.sku}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-700 text-xs">
                            {item.location?.code || item.product.location?.code || 'PADRÃO'} &rarr; EXPEDIÇÃO
                          </td>
                          <td className="px-3 py-2 text-center text-slate-600">
                            {item.requestedQuantity} {item.product.unit}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-900">
                            {item.pickedQuantity} {item.product.unit}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-700 font-mono">
                            {item.product.currentStock} {item.product.unit}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isZero ? (
                              <span className="text-slate-400 text-[11px]">Item zerado</span>
                            ) : hasStock ? (
                              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-300">
                                Saldo OK
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded-sm border border-rose-300">
                                Insuficiente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodapé */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-sm hover:bg-slate-100"
              >
                Fechar
              </button>

              {selectedOrder.status === 'PICKED' && canOperate && (
                <button
                  type="button"
                  onClick={() => handleShipOrder(selectedOrder.id)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded-sm shadow-none transition-colors flex items-center space-x-1.5"
                >
                  <Truck className="w-3.5 h-3.5 text-sky-400" />
                  <span>{actionLoading ? 'Processando baixa...' : 'Confirmar Expedição & Baixa'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
