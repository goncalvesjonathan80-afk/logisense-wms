import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  Boxes,
  ArrowRight,
  MapPin,
  Clock,
  Ban,
  ShoppingCart,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  CreateOrderInput,
  Location,
  Order,
  OrderStatus,
  Product,
} from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; step: number }
> = {
  PENDING: {
    label: 'Pendente',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    step: 1,
  },
  PICKING: {
    label: 'Em Separação',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    step: 2,
  },
  PICKED: {
    label: 'Conferido (Separado)',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    step: 3,
  },
  SHIPPED: {
    label: 'Expedido',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    step: 4,
  },
  CANCELLED: {
    label: 'Cancelado',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    step: 0,
  },
};

export const OrdersPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canOperate = hasRole(['ADMIN', 'GERENTE', 'OPERADOR']);
  const canCancel = hasRole(['ADMIN', 'GERENTE']);

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal de Criação de Pedido
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateOrderInput>({
    customerName: '',
    notes: '',
    items: [],
  });

  // Linha temporária de item para o formulário de criação
  const [tempItem, setTempItem] = useState<{
    productId: string;
    requestedQuantity: number;
    locationId?: string;
  }>({
    productId: '',
    requestedQuantity: 1,
    locationId: '',
  });

  // Modal de Detalhes do Pedido
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersRes, productsRes, locationsRes] = await Promise.all([
        api.getOrders({
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          search: searchTerm || undefined,
        }),
        api.getProducts({ status: 'ACTIVE' }),
        api.getLocations(),
      ]);

      setOrders(ordersRes.orders || []);
      setProducts(productsRes.products || []);
      setLocations(locationsRes.locations || []);

      if (selectedOrder) {
        const updated = await api.getOrderById(selectedOrder.id);
        if (updated?.order) setSelectedOrder(updated.order);
      }
    } catch (err: any) {
      console.error('Erro ao carregar pedidos:', err);
      setError(err.message || 'Erro ao carregar lista de pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus, searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedOrder) setSelectedOrder(null);
        else if (isCreateModalOpen) setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, selectedOrder]);

  // Contadores para os Cards
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'PENDING').length,
    picking: orders.filter((o) => o.status === 'PICKING').length,
    picked: orders.filter((o) => o.status === 'PICKED').length,
    shipped: orders.filter((o) => o.status === 'SHIPPED').length,
  };

  // Funções de Criação
  const handleOpenCreateModal = () => {
    setCreateFormData({
      customerName: '',
      notes: '',
      items: [],
    });
    setTempItem({
      productId: products.length > 0 ? products[0].id : '',
      requestedQuantity: 1,
      locationId: products.length > 0 && products[0].locationId ? products[0].locationId : '',
    });
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleAddTempItem = () => {
    if (!tempItem.productId) {
      setCreateError('Selecione um produto.');
      return;
    }
    if (tempItem.requestedQuantity <= 0 || !Number.isInteger(Number(tempItem.requestedQuantity))) {
      setCreateError('A quantidade solicitada deve ser um número inteiro maior que zero.');
      return;
    }

    const existingIndex = createFormData.items.findIndex(
      (it) => it.productId === tempItem.productId
    );

    if (existingIndex >= 0) {
      const updatedItems = [...createFormData.items];
      updatedItems[existingIndex].requestedQuantity += Number(tempItem.requestedQuantity);
      setCreateFormData({ ...createFormData, items: updatedItems });
    } else {
      setCreateFormData({
        ...createFormData,
        items: [
          ...createFormData.items,
          {
            productId: tempItem.productId,
            requestedQuantity: Number(tempItem.requestedQuantity),
            locationId: tempItem.locationId || undefined,
          },
        ],
      });
    }

    setCreateError(null);
  };

  const handleRemoveItem = (index: number) => {
    const updated = createFormData.items.filter((_, i) => i !== index);
    setCreateFormData({ ...createFormData, items: updated });
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.customerName.trim()) {
      setCreateError('O nome do cliente é obrigatório.');
      return;
    }
    if (createFormData.items.length === 0) {
      setCreateError('Adicione pelo menos um produto ao pedido.');
      return;
    }

    try {
      setSubmittingCreate(true);
      setCreateError(null);
      const res = await api.createOrder(createFormData);
      setIsCreateModalOpen(false);
      setSuccessMessage(res.message || 'Pedido criado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao registrar pedido.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Cancelar Pedido
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Tem certeza de que deseja cancelar este pedido? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      const res = await api.cancelOrder(orderId);
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 5000);

      if (selectedOrder?.id === orderId) {
        const updated = await api.getOrderById(orderId);
        setSelectedOrder(updated.order);
      }
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erro ao cancelar pedido.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gestão de Pedidos"
        subtitle="Criação de novos pedidos, consulta de carteira e acompanhamento dos estágios operacionais"
        icon={Package}
        actions={
          <>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
              title="Atualizar listagem"
              aria-label="Atualizar listagem de pedidos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>

            {canOperate && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Novo Pedido</span>
              </button>
            )}
          </>
        }
      />

      {/* Alertas */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm flex items-center justify-between text-emerald-800 text-xs"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            aria-label="Fechar mensagem de sucesso"
            className="text-emerald-600"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 rounded-sm flex items-center justify-between text-rose-800 text-xs"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Fechar mensagem de erro"
            className="text-rose-600"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Cards de Resumo (Filtros Interativos) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setSelectedStatus('ALL')}
          className={`text-left p-3 rounded-md border shadow-none transition-colors cursor-pointer select-none ${
            selectedStatus === 'ALL'
              ? 'bg-slate-50/80 border-slate-400'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
          }`}
          title="Ver todos os pedidos"
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total de Pedidos</p>
          <p className="text-xl font-bold text-slate-900 mt-1 font-sans">{stats.total}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`text-left p-3 rounded-md border shadow-none border-l-2 border-l-slate-400 transition-colors cursor-pointer select-none ${
            selectedStatus === 'PENDING'
              ? 'bg-slate-100/70 border-slate-400 ring-1 ring-slate-400/40'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
          }`}
          title="Filtrar pedidos pendentes"
        >
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Pendentes</p>
          <p className="text-xl font-bold text-slate-800 mt-1 font-sans">{stats.pending}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'PICKING' ? 'ALL' : 'PICKING')}
          className={`text-left p-3 rounded-md border shadow-none border-l-2 border-l-amber-500 transition-colors cursor-pointer select-none ${
            selectedStatus === 'PICKING'
              ? 'bg-amber-50/50 border-amber-400 ring-1 ring-amber-400/40'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
          }`}
          title="Filtrar pedidos em separação"
        >
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Em Separação</p>
          <p className="text-xl font-bold text-amber-700 mt-1 font-sans">{stats.picking}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'PICKED' ? 'ALL' : 'PICKED')}
          className={`text-left p-3 rounded-md border shadow-none border-l-2 border-l-sky-500 transition-colors cursor-pointer select-none ${
            selectedStatus === 'PICKED'
              ? 'bg-sky-50/50 border-sky-400 ring-1 ring-sky-400/40'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
          }`}
          title="Filtrar pedidos conferidos / prontos"
        >
          <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Conferidos</p>
          <p className="text-xl font-bold text-sky-700 mt-1 font-sans">{stats.picked}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'SHIPPED' ? 'ALL' : 'SHIPPED')}
          className={`text-left p-3 rounded-md border shadow-none border-l-2 border-l-emerald-500 transition-colors cursor-pointer select-none ${
            selectedStatus === 'SHIPPED'
              ? 'bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-400/40'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
          }`}
          title="Filtrar pedidos expedidos"
        >
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Expedidos</p>
          <p className="text-xl font-bold text-emerald-700 mt-1 font-sans">{stats.shipped}</p>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-3 rounded-md border border-slate-200 flex flex-col md:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            aria-label="Buscar pedidos por número ou cliente"
            placeholder="Buscar por PED-... ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <label htmlFor="orders-status-filter" className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Status:
          </label>
          <select
            id="orders-status-filter"
            aria-label="Filtrar pedidos por status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium text-slate-700"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDING">Pendente</option>
            <option value="PICKING">Em Separação</option>
            <option value="PICKED">Conferido (Pronto)</option>
            <option value="SHIPPED">Expedido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Pedidos */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th scope="col" className="py-2.5 px-3">Número</th>
                <th scope="col" className="py-2.5 px-3">Cliente / Destinatário</th>
                <th scope="col" className="py-2.5 px-3 text-center">Itens</th>
                <th scope="col" className="py-2.5 px-3 text-center">Status</th>
                <th scope="col" className="py-2.5 px-3">Responsável</th>
                <th scope="col" className="py-2.5 px-3">Data</th>
                <th scope="col" className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" aria-hidden="true" />
                    Carregando pedidos...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" aria-hidden="true" />
                    <p className="font-semibold text-slate-700">Nenhum pedido encontrado</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clique em "Novo Pedido" para registrar um pedido.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-800">
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
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-sm text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {order.items ? order.items.length : order._count?.items ?? 0} item(ns)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {order.shippedBy
                          ? `Despachado por ${order.shippedBy}`
                          : order.pickedBy
                          ? `Separado por ${order.pickedBy}`
                          : order.user?.name || 'Sistema'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setSelectedOrder(order);
                          }}
                          aria-label={`Ver detalhes do pedido ${order.orderNumber}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:text-sky-800 hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Detalhes</span>
                        </button>

                        {canOperate && (order.status === 'PENDING' || order.status === 'PICKING') && (
                          <Link
                            to="/operacoes/picking"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-sm hover:bg-amber-100 transition-colors"
                            title="Acessar módulo de Picking"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Ir p/ Picking</span>
                          </Link>
                        )}

                        {canOperate && order.status === 'PICKED' && (
                          <Link
                            to="/operacoes/expedicao"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm hover:bg-emerald-100 transition-colors"
                            title="Acessar módulo de Expedição"
                          >
                            <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Ir p/ Expedição</span>
                          </Link>
                        )}

                        {canCancel && order.status !== 'SHIPPED' && order.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order.id)}
                            className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-sm transition-colors"
                            title="Cancelar pedido"
                            aria-label={`Cancelar pedido ${order.orderNumber}`}
                          >
                            <Ban className="w-3.5 h-3.5" aria-hidden="true" />
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
      </div>

      {/* MODAL: NOVO PEDIDO */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-order-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto"
        >
          <div className="bg-white w-full max-w-2xl rounded-md shadow-xl border border-slate-300 overflow-hidden my-8">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2 text-sky-700">
                <Package className="w-4 h-4" aria-hidden="true" />
                <h3 id="create-order-modal-title" className="font-bold text-slate-900 text-xs uppercase tracking-wider">Novo Pedido</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Fechar modal de novo pedido"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-sm"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-5 space-y-3.5">
              {createError && (
                <div role="alert" className="p-2.5 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cliente / Destinatário *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercados Delta Ltda"
                  value={createFormData.customerName}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, customerName: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instruções de entrega, doca preferencial, etc."
                  value={createFormData.notes || ''}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, notes: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800"
                />
              </div>

              {/* Construtor de Itens */}
              <div className="border-t border-slate-200 pt-3 space-y-2.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Itens do Pedido ({createFormData.items.length})
                </h4>

                <div className="bg-slate-50 p-3 rounded-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Produto Ativo
                    </label>
                    <select
                      value={tempItem.productId}
                      onChange={(e) => {
                        const prod = products.find((p) => p.id === e.target.value);
                        setTempItem({
                          ...tempItem,
                          productId: e.target.value,
                          locationId: prod?.locationId || '',
                        });
                      }}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — Saldo: {p.currentStock} {p.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Qtd Solicitada
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tempItem.requestedQuantity}
                      onChange={(e) =>
                        setTempItem({
                          ...tempItem,
                          requestedQuantity: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-sky-500 text-center font-bold font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddTempItem}
                      className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-sky-700 rounded-sm hover:bg-sky-600 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

                {createFormData.items.length > 0 && (
                  <div className="border border-slate-200 rounded-sm divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {createFormData.items.map((it, idx) => {
                      const prod = products.find((p) => p.id === it.productId);
                      return (
                        <div
                          key={idx}
                          className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{prod?.name}</span>
                            <span className="text-slate-400 ml-1 font-mono text-[11px]">({prod?.sku})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-sm border border-sky-200 font-mono">
                              {it.requestedQuantity} {prod?.unit}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-sm hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-700 rounded-sm hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <span>{submittingCreate ? 'Salvando...' : 'Registrar Pedido'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DO PEDIDO */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-details-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto"
        >
          <div className="bg-white w-full max-w-2xl rounded-md shadow-xl border border-slate-300 overflow-hidden my-6">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2 text-sky-700">
                <Package className="w-4 h-4" aria-hidden="true" />
                <div>
                  <h3 id="order-details-modal-title" className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Pedido {selectedOrder.orderNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cliente: <strong>{selectedOrder.customerName || selectedOrder.customer}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Fechar detalhes do pedido"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-sm"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-sm border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1 uppercase font-semibold text-[10px]">Status:</span>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Cadastrado por:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedOrder.user?.name || 'Sistema'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Separado por:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedOrder.pickedBy || 'Pendente'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Expedido por:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedOrder.shippedBy || 'Pendente'}
                  </span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-sm border border-slate-200">
                  <span className="font-semibold block text-slate-700">Observações:</span>
                  {selectedOrder.notes}
                </div>
              )}

              {/* Tabela de Itens */}
              <div className="border border-slate-200 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                    <tr>
                      <th scope="col" className="px-3 py-2">Produto / SKU</th>
                      <th scope="col" className="px-3 py-2">Localização</th>
                      <th scope="col" className="px-3 py-2 text-center">Qtd Solicitada</th>
                      <th scope="col" className="px-3 py-2 text-center">Qtd Separada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">
                          <div>{item.product.name}</div>
                          <div className="text-slate-400 font-mono text-[10px]">{item.product.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                          {item.location?.code || item.product.location?.code || 'PADRÃO'}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-slate-800 font-mono">
                          {item.requestedQuantity} {item.product.unit}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-sky-800 font-mono">
                          {item.pickedQuantity} {item.product.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-sm hover:bg-slate-100"
              >
                Fechar
              </button>

              {canOperate && (
                <div className="flex items-center space-x-2">
                  {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'PICKING') && (
                    <Link
                      to="/operacoes/picking"
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-sm transition-colors flex items-center space-x-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Ir para Picking &rarr;</span>
                    </Link>
                  )}

                  {selectedOrder.status === 'PICKED' && (
                    <Link
                      to="/operacoes/expedicao"
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-sm transition-colors flex items-center space-x-1"
                    >
                      <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Ir para Expedição &rarr;</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
