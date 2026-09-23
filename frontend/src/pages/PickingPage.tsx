import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Boxes,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  CheckSquare,
  ArrowRight,
  MapPin,
  Clock,
  Truck,
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
    label: 'Separação Concluída',
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

export const PickingPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canOperate = hasRole(['ADMIN', 'GERENTE', 'OPERADOR']);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING_PICKING' | 'PENDING' | 'PICKING' | 'PICKED' | 'ALL'>(
    'PENDING_PICKING'
  );

  // Modal de Conferência de Picking
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pickingItemsState, setPickingItemsState] = useState<
    Array<{ id: string; pickedQuantity: number; locationId?: string }>
  >([]);

  // Carregar dados
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      let statusParam: string | undefined = undefined;
      if (statusFilter === 'PENDING') statusParam = 'PENDING';
      else if (statusFilter === 'PICKING') statusParam = 'PICKING';
      else if (statusFilter === 'PICKED') statusParam = 'PICKED';

      const res = await api.getOrders({
        status: statusParam,
        search: searchTerm || undefined,
      });

      let filtered = res.orders || [];
      if (statusFilter === 'PENDING_PICKING') {
        filtered = filtered.filter((o) => o.status === 'PENDING' || o.status === 'PICKING');
      }

      setOrders(filtered);

      // Se modal estiver aberto, atualizar dados
      if (selectedOrder) {
        const updated = await api.getOrderById(selectedOrder.id);
        if (updated?.order) setSelectedOrder(updated.order);
      }
    } catch (err: any) {
      console.error('Erro ao carregar lista de picking:', err);
      setError(err.message || 'Erro ao carregar pedidos para separação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, searchTerm]);

  // Sincronizar itens de picking ao selecionar um pedido
  useEffect(() => {
    if (selectedOrder?.items) {
      setPickingItemsState(
        selectedOrder.items.map((item) => ({
          id: item.id,
          pickedQuantity:
            item.pickedQuantity > 0 || selectedOrder.status === 'PICKED' || selectedOrder.status === 'SHIPPED'
              ? item.pickedQuantity
              : item.requestedQuantity,
          locationId: item.locationId || item.product?.location?.id || undefined,
        }))
      );
    } else {
      setPickingItemsState([]);
    }
  }, [selectedOrder]);

  // Contadores
  const countPending = orders.filter((o) => o.status === 'PENDING').length;
  const countPicking = orders.filter((o) => o.status === 'PICKING').length;

  // Iniciar Separação
  const handleStartPicking = async (orderId: string) => {
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await api.startPicking(orderId);
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 5000);
      const updated = await api.getOrderById(orderId);
      setSelectedOrder(updated.order);
      await loadOrders();
    } catch (err: any) {
      setActionError(err.message || 'Erro ao iniciar separação.');
    } finally {
      setActionLoading(false);
    }
  };

  // Salvar Conferência Física de Picking
  const handleSavePickingConference = async () => {
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      setActionError(null);

      // Validar se há quantidades negativas
      const hasNegative = pickingItemsState.some((it) => it.pickedQuantity < 0);
      if (hasNegative) {
        setActionError('A quantidade separada não pode ser negativa.');
        setActionLoading(false);
        return;
      }

      const res = await api.pickOrder(selectedOrder.id, pickingItemsState);
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 5000);

      const updated = await api.getOrderById(selectedOrder.id);
      setSelectedOrder(updated.order);
      await loadOrders();
    } catch (err: any) {
      setActionError(err.message || 'Erro ao salvar conferência de separação.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Separação de Mercadorias (Picking)"
        subtitle="Coleta física de itens nos corredores do armazém e conferência de quantidades por pedido"
        icon={ShoppingCart}
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
              to="/operacoes/pedidos"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-sm transition-colors"
            >
              Ver Todos os Pedidos
            </Link>
          </>
        }
      />

      {/* Alerta de Nota Operacional */}
      <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-sm text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Regra Operacional:</strong> A conferência de picking registra as quantidades físicas separadas, mas <strong>NÃO baixa o estoque</strong>. A dedução de saldo ocorre somente na tela de Expedição.
          </span>
        </div>
      </div>

      {/* Mensagens de Sucesso ou Erro */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-sm flex items-center justify-between text-rose-800 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white p-3 rounded-md border border-slate-200 flex flex-col md:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número do pedido ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
          />
        </div>

        {/* Abas Rápidas de Status */}
        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('PENDING_PICKING')}
            className={`px-2.5 py-1 rounded-sm font-semibold transition-colors border ${
              statusFilter === 'PENDING_PICKING'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Aguardando / Em Separação
          </button>
          <button
            onClick={() => setStatusFilter('PICKING')}
            className={`px-2.5 py-1 rounded-sm font-semibold transition-colors border ${
              statusFilter === 'PICKING'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Em Separação
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-2.5 py-1 rounded-sm font-semibold transition-colors border ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Aguardando Início
          </button>
          <button
            onClick={() => setStatusFilter('PICKED')}
            className={`px-2.5 py-1 rounded-sm font-semibold transition-colors border ${
              statusFilter === 'PICKED'
                ? 'bg-sky-700 text-white border-sky-700'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Conferidos
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-sm font-semibold transition-colors border ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Tabela de Pedidos para Picking */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Número do Pedido</th>
                <th className="py-2.5 px-3">Cliente / Destinatário</th>
                <th className="py-2.5 px-3 text-center">Itens a Separar</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Data do Pedido</th>
                <th className="py-2.5 px-3 text-right">Ação de Picking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Carregando fila de picking...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">Nenhum pedido aguardando separação</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Altere o filtro de status acima para consultar outros estágios.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                        {order.orderNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">
                          {order.customerName || order.customer || 'Cliente'}
                        </span>
                        {order.notes && (
                          <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                            {order.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-sm text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {order.items ? order.items.length : order._count?.items ?? 0} item(ns)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        {order.status === 'PENDING' && canOperate && (
                          <button
                            onClick={() => handleStartPicking(order.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-sm transition-colors"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                            <span>Iniciar Separação</span>
                          </button>
                        )}

                        {order.status === 'PICKING' && (
                          <button
                            onClick={() => {
                              setActionError(null);
                              setSelectedOrder(order);
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-sm transition-colors"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Conferir Itens</span>
                          </button>
                        )}

                        {order.status === 'PICKED' && (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => {
                                setActionError(null);
                                setSelectedOrder(order);
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-sm transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Itens</span>
                            </button>
                            <Link
                              to="/operacoes/expedicao"
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-sm transition-colors"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Ir para Expedição</span>
                            </Link>
                          </div>
                        )}

                        {order.status === 'SHIPPED' && (
                          <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200 uppercase">
                            Expedido
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CONFERÊNCIA DE PICKING */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-md shadow-xl border border-slate-300 overflow-hidden my-6">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-amber-50/50">
              <div className="flex items-center space-x-2 text-amber-700">
                <ShoppingCart className="w-4 h-4" />
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Conferência de Separação (Picking) — {selectedOrder.orderNumber}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-slate-500">
                      Cliente: <strong>{selectedOrder.customerName || selectedOrder.customer}</strong>
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
            <div className="p-5 space-y-3.5">
              {actionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {selectedOrder.status === 'PICKING' ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-800 flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Digite as quantidades reais separadas de cada produto. O sistema aceita 0 para itens não localizados fisicamente (falta).
                  </span>
                </div>
              ) : selectedOrder.status === 'PICKED' ? (
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-sm text-xs text-sky-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                    <span>
                      Separação concluída por <strong>{selectedOrder.pickedBy || 'Operador'}</strong> em{' '}
                      {selectedOrder.pickedAt
                        ? new Date(selectedOrder.pickedAt).toLocaleString('pt-BR')
                        : ''}
                      . O pedido está pronto para expedição.
                    </span>
                  </div>
                  <Link
                    to="/operacoes/expedicao"
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-sm text-xs font-semibold shrink-0 ml-2"
                  >
                    Ir para Expedição &rarr;
                  </Link>
                </div>
              ) : null}

              {/* Tabela de Itens */}
              <div className="border border-slate-200 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Produto / SKU</th>
                      <th className="px-3 py-2">Endereço de Coleta</th>
                      <th className="px-3 py-2 text-center">Saldo em Estoque</th>
                      <th className="px-3 py-2 text-center">Qtd Solicitada</th>
                      <th className="px-3 py-2 text-center w-32">Qtd Separada</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((item) => {
                      const stateItem = pickingItemsState.find((s) => s.id === item.id);
                      const pickedQty = stateItem ? stateItem.pickedQuantity : item.pickedQuantity || 0;
                      const diff = pickedQty - item.requestedQuantity;
                      const isEditing = selectedOrder.status === 'PICKING' && canOperate;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">
                            <div>{item.product.name}</div>
                            <div className="text-slate-400 font-mono text-[10px]">
                              {item.product.sku}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center space-x-1 text-slate-800 bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-300 font-mono font-bold text-xs tracking-wider">
                              <MapPin className="w-3 h-3 text-sky-700 shrink-0" />
                              <span>{item.location?.code || item.product.location?.code || 'PADRÃO'}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-600 font-mono">
                            {item.product.currentStock} {item.product.unit}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-800 font-mono">
                            {item.requestedQuantity} {item.product.unit}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={pickedQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setPickingItemsState((prev) =>
                                    prev.map((it) =>
                                      it.id === item.id ? { ...it, pickedQuantity: val } : it
                                    )
                                  );
                                }}
                                className="w-20 px-2 py-1 text-center font-bold font-mono text-xs bg-white border border-slate-300 rounded-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                            ) : (
                              <span className="font-bold text-amber-700 font-mono">
                                {item.pickedQuantity} {item.product.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {diff === 0 ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-sm border border-emerald-200">
                                Separado
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded-sm border border-rose-200 font-mono">
                                Falta {Math.abs(diff)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded-sm border border-sky-200 font-mono">
                                +{diff}
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
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-sm hover:bg-slate-100"
              >
                Fechar
              </button>

              {selectedOrder.status === 'PICKING' && canOperate && (
                <button
                  type="button"
                  onClick={handleSavePickingConference}
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-sm transition-colors flex items-center space-x-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Salvando...' : 'Concluir Separação'}</span>
                </button>
              )}

              {selectedOrder.status === 'PICKED' && (
                <Link
                  to="/operacoes/expedicao"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-sm transition-colors flex items-center space-x-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Avançar para Expedição</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
