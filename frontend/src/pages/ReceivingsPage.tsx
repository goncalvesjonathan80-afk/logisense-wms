import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  CheckSquare,
  Boxes,
  ArrowRight,
  MapPin,
  Clock,
  AlertTriangle,
  Layers,
  Ban,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  CreateReceivingInput,
  Location,
  Product,
  Receiving,
  ReceivingStatus,
} from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';

const STATUS_CONFIG: Record<
  ReceivingStatus,
  { label: string; bg: string; text: string; border: string; step: number }
> = {
  PENDING: {
    label: 'Pendente',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    step: 1,
  },
  CHECKING: {
    label: 'Em Conferência',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    step: 2,
  },
  CHECKED: {
    label: 'Conferido',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    step: 3,
  },
  STORED: {
    label: 'Armazenado',
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

export const ReceivingsPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canOperate = hasRole(['ADMIN', 'GERENTE', 'OPERADOR']);
  const canCancel = hasRole(['ADMIN', 'GERENTE']);

  const [receivings, setReceivings] = useState<Receiving[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal de Criação
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateReceivingInput>({
    supplier: '',
    notes: '',
    items: [],
  });

  // Linha temporária de item para o formulário de criação
  const [tempItem, setTempItem] = useState<{
    productId: string;
    expectedQuantity: number;
    locationId: string;
  }>({
    productId: '',
    expectedQuantity: 10,
    locationId: '',
  });

  // Modal de Detalhes / Conferência / Armazenagem
  const [selectedReceiving, setSelectedReceiving] = useState<Receiving | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Estado dos inputs durante a conferência
  const [checkingItems, setCheckingItems] = useState<
    Record<string, { receivedQuantity: number; locationId?: string }>
  >({});

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [recRes, prodRes, locRes] = await Promise.all([
        api.getReceivings({ status: selectedStatus, search: searchTerm }),
        api.getProducts(),
        api.getLocations(),
      ]);

      setReceivings(recRes.receivings);
      setProducts(prodRes.products);
      setLocations(locRes.locations);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar recebimentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Abrir Modal de Criação
  const openCreateModal = () => {
    setCreateFormData({
      supplier: '',
      notes: '',
      items: [],
    });
    setTempItem({
      productId: products[0]?.id || '',
      expectedQuantity: 10,
      locationId: locations[0]?.id || '',
    });
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleAddTempItem = () => {
    if (!tempItem.productId) {
      setCreateError('Selecione um produto.');
      return;
    }
    if (tempItem.expectedQuantity <= 0) {
      setCreateError('A quantidade esperada deve ser maior que zero.');
      return;
    }

    setCreateFormData({
      ...createFormData,
      items: [
        ...(createFormData.items || []),
        {
          productId: tempItem.productId,
          expectedQuantity: tempItem.expectedQuantity,
          locationId: tempItem.locationId || undefined,
        },
      ],
    });

    setCreateError(null);
  };

  const handleRemoveItem = (index: number) => {
    const nextItems = [...(createFormData.items || [])];
    nextItems.splice(index, 1);
    setCreateFormData({ ...createFormData, items: nextItems });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createFormData.supplier.trim()) {
      setCreateError('Informe o nome do fornecedor.');
      return;
    }

    if (!createFormData.items || createFormData.items.length === 0) {
      setCreateError('Adicione pelo menos um produto ao recebimento.');
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await api.createReceiving(createFormData);
      setSuccessMessage(`Recebimento ${res.receiving.receivingNumber} criado com sucesso!`);
      setIsCreateModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao criar recebimento');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Abrir Detalhes
  const openDetailModal = async (recId: string) => {
    try {
      setLoadingDetail(true);
      setActionError(null);
      setIsDetailModalOpen(true);

      const res = await api.getReceivingById(recId);
      setSelectedReceiving(res.receiving);

      // Inicializar itens de conferência
      const initialMap: Record<string, { receivedQuantity: number; locationId?: string }> = {};
      res.receiving.items?.forEach((it) => {
        initialMap[it.id] = {
          receivedQuantity: it.receivedQuantity > 0 ? it.receivedQuantity : it.expectedQuantity,
          locationId: it.locationId || it.location?.id || locations[0]?.id || '',
        };
      });
      setCheckingItems(initialMap);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao carregar detalhes do recebimento');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Ação 1: Iniciar Conferência
  const handleStartChecking = async () => {
    if (!selectedReceiving) return;
    try {
      setActionSubmitting(true);
      setActionError(null);
      const res = await api.startChecking(selectedReceiving.id);
      setSelectedReceiving(res.receiving);
      setSuccessMessage(`Conferência iniciada para o recebimento ${res.receiving.receivingNumber}`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erro ao iniciar conferência');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Ação 2: Concluir Conferência
  const handleCheckSubmit = async () => {
    if (!selectedReceiving || !selectedReceiving.items) return;

    // Validar quantidades
    const payloadItems = selectedReceiving.items.map((it) => {
      const state = checkingItems[it.id];
      const receivedQuantity = state ? parseInt(String(state.receivedQuantity), 10) : 0;
      return {
        id: it.id,
        receivedQuantity: isNaN(receivedQuantity) ? 0 : receivedQuantity,
        locationId: state?.locationId || it.locationId || undefined,
      };
    });

    const hasNegative = payloadItems.some((it) => it.receivedQuantity < 0);
    if (hasNegative) {
      setActionError('A quantidade recebida não pode ser negativa.');
      return;
    }

    try {
      setActionSubmitting(true);
      setActionError(null);
      const res = await api.checkReceiving(selectedReceiving.id, payloadItems);
      setSelectedReceiving(res.receiving);
      setSuccessMessage('Conferência registrada com sucesso! Status alterado para CONFERIDO.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erro ao salvar conferência');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Ação 3: Armazenar no Estoque
  const handleStoreSubmit = async () => {
    if (!selectedReceiving) return;

    if (
      !window.confirm(
        `Confirmar a armazenagem física do recebimento ${selectedReceiving.receivingNumber}? Os saldos de estoque serão atualizados e as movimentações de entrada serão geradas.`
      )
    ) {
      return;
    }

    try {
      setActionSubmitting(true);
      setActionError(null);
      const res = await api.storeReceiving(selectedReceiving.id);
      setSelectedReceiving(res.receiving);
      setSuccessMessage(
        `Armazenagem concluída com sucesso! ${res.storedUnits} unidades deram entrada no estoque.`
      );
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erro ao efetivar armazenagem');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Ação 4: Cancelar Recebimento
  const handleCancelSubmit = async () => {
    if (!selectedReceiving) return;
    if (!window.confirm(`Deseja realmente cancelar o recebimento ${selectedReceiving.receivingNumber}?`)) {
      return;
    }

    try {
      setActionSubmitting(true);
      setActionError(null);
      const res = await api.cancelReceiving(selectedReceiving.id);
      setSelectedReceiving(res.receiving);
      setSuccessMessage('Recebimento cancelado com sucesso.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erro ao cancelar recebimento');
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <PageHeader
        title="Recebimento & Armazenagem"
        subtitle="Fluxo integrado: Fornecedor → Conferência Física → Armazenagem → Saldo no Estoque"
        icon={Truck}
        actions={
          <>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
              title="Atualizar listagem"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {canOperate && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Recebimento</span>
              </button>
            )}
          </>
        }
      />

      {/* Alertas */}
      {successMessage && (
        <div className="p-3 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white p-3 rounded-md border border-slate-200 flex flex-col md:flex-row gap-2.5 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por fornecedor ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDING">Pendente</option>
            <option value="CHECKING">Em Conferência</option>
            <option value="CHECKED">Conferido</option>
            <option value="STORED">Armazenado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Recebimentos */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Número</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Fornecedor</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Itens</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3">Observações</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && receivings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Carregando recebimentos...
                  </td>
                </tr>
              ) : receivings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Nenhum recebimento encontrado.
                  </td>
                </tr>
              ) : (
                receivings.map((rec) => {
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-800">
                        {rec.receivingNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {new Date(rec.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {rec.supplier}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={rec.status} />
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {rec._count?.items ?? 0}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <div>{rec.user?.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {rec.user?.role}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                        {rec.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => openDetailModal(rec.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:text-sky-800 hover:bg-slate-100 rounded-sm transition-colors border border-slate-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Gerenciar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 border-t border-slate-200 bg-slate-50/70 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Total: {receivings.length} recebimentos registrados</span>
          <span className="text-slate-400">Armazém Geral</span>
        </div>
      </div>

      {/* Modal: Novo Recebimento */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white rounded-md border border-slate-300 shadow-xl max-w-xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-700" />
                Registrar Novo Recebimento de Mercadorias
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 space-y-3.5">
              {createError && (
                <div className="p-2.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Fornecedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Madeireira Campineira Ltda / Klabin S.A."
                  value={createFormData.supplier}
                  onChange={(e) => setCreateFormData({ ...createFormData, supplier: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações / Dados da Carga
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: NF 45892, Doca 2, motorista Marcos..."
                  value={createFormData.notes || ''}
                  onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              {/* Seção de Adicionar Itens */}
              <div className="pt-3 border-t border-slate-200">
                <span className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Itens a Receber
                </span>

                <div className="p-3 rounded-sm bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] text-slate-600 font-semibold mb-1">Produto</label>
                      <select
                        value={tempItem.productId}
                        onChange={(e) => setTempItem({ ...tempItem, productId: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-sm text-xs text-slate-800"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id} disabled={p.status === 'INACTIVE'}>
                            {p.sku} - {p.name}
                            {p.status === 'INACTIVE' ? ' [INATIVO]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 font-semibold mb-1">Qtd Esperada</label>
                      <input
                        type="number"
                        min="1"
                        value={tempItem.expectedQuantity}
                        onChange={(e) =>
                          setTempItem({
                            ...tempItem,
                            expectedQuantity: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-sm text-xs font-mono text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 font-semibold mb-1">Destino Padrão</label>
                      <select
                        value={tempItem.locationId}
                        onChange={(e) => setTempItem({ ...tempItem, locationId: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-sm text-xs text-slate-800"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} ({loc.aisle}-{loc.rack})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddTempItem}
                    className="w-full py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-sm transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar à Lista de Conferência
                  </button>
                </div>

                {/* Lista de Itens adicionados */}
                <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
                  {createFormData.items && createFormData.items.length > 0 ? (
                    createFormData.items.map((it, idx) => {
                      const prod = products.find((p) => p.id === it.productId);
                      const loc = locations.find((l) => l.id === it.locationId);

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-sm bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">
                              {prod?.name || it.productId}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono ml-2">
                              Qtd: {it.expectedQuantity} {prod?.unit || 'UN'} | Destino: {loc?.code || 'A definir'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-3 text-slate-400 text-xs italic">
                      Nenhum item adicionado ainda.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-sm border border-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-sm transition-all disabled:opacity-50"
                >
                  {submittingCreate ? 'Criando...' : 'Salvar Recebimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalhes, Conferência & Armazenagem */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white rounded-md border border-slate-300 shadow-xl max-w-3xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-sm bg-slate-900 text-white">
                  <Truck className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recebimento {selectedReceiving?.receivingNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Fornecedor: <span className="font-semibold text-slate-700">{selectedReceiving?.supplier}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {actionError && (
                <div className="p-2.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Stepper Visual de Status */}
              {selectedReceiving && (
                <div className="bg-slate-50 p-3.5 rounded-sm border border-slate-200">
                  <div className="flex items-center justify-between max-w-lg mx-auto text-xs">
                    {/* Passo 1 */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-sm flex items-center justify-center font-bold text-[11px] ${
                          ['PENDING', 'CHECKING', 'CHECKED', 'STORED'].includes(selectedReceiving.status)
                            ? 'bg-sky-700 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        1
                      </div>
                      <span className="text-[10px] font-semibold mt-1 text-slate-700">Recebimento</span>
                    </div>

                    <div className="w-12 h-px bg-slate-300" />

                    {/* Passo 2 */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-sm flex items-center justify-center font-bold text-[11px] ${
                          ['CHECKING', 'CHECKED', 'STORED'].includes(selectedReceiving.status)
                            ? 'bg-sky-700 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        2
                      </div>
                      <span className="text-[10px] font-semibold mt-1 text-slate-700">Conferência</span>
                    </div>

                    <div className="w-12 h-px bg-slate-300" />

                    {/* Passo 3 */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-sm flex items-center justify-center font-bold text-[11px] ${
                          ['CHECKED', 'STORED'].includes(selectedReceiving.status)
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        3
                      </div>
                      <span className="text-[10px] font-semibold mt-1 text-slate-700">Conferido</span>
                    </div>

                    <div className="w-12 h-px bg-slate-300" />

                    {/* Passo 4 */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-sm flex items-center justify-center font-bold text-[11px] ${
                          selectedReceiving.status === 'STORED'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        4
                      </div>
                      <span className="text-[10px] font-semibold mt-1 text-slate-700">Armazenado</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Informações Gerais */}
              {selectedReceiving && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-sm border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] mb-1 uppercase font-semibold">Status Operacional</span>
                    <StatusBadge status={selectedReceiving.status} />
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Criado por</span>
                    <span className="font-semibold text-slate-800">
                      {selectedReceiving.user?.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Conferido por</span>
                    <span className="font-medium text-slate-700">
                      {selectedReceiving.checkedBy || 'Pendente'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Armazenado por</span>
                    <span className="font-medium text-slate-700">
                      {selectedReceiving.storedBy || 'Pendente'}
                    </span>
                  </div>
                </div>
              )}

              {/* Tabela de Itens para Conferência / Armazenagem */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                    Itens do Recebimento (Produto | Esperado | Recebido | Diferença)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {selectedReceiving?.items?.length || 0} itens
                  </span>
                </div>

                <div className="border border-slate-200 rounded-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                        <th className="py-2 px-3">Produto</th>
                        <th className="py-2 px-3 text-center">Esperado</th>
                        <th className="py-2 px-3 text-center">Recebido (Físico)</th>
                        <th className="py-2 px-3 text-center">Diferença</th>
                        <th className="py-2 px-3">Localização Destino</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReceiving?.items?.map((it) => {
                        const state = checkingItems[it.id] || {
                          receivedQuantity: it.receivedQuantity,
                          locationId: it.locationId,
                        };

                        const isChecking = selectedReceiving.status === 'CHECKING';
                        const currentReceived = isChecking ? state.receivedQuantity : it.receivedQuantity;
                        const difference = currentReceived - it.expectedQuantity;

                        return (
                          <tr key={it.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-800">
                                {it.product.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                SKU: {it.product.sku}
                              </div>
                            </td>

                            <td className="py-2 px-3 text-center font-bold text-slate-700 font-mono">
                              {it.expectedQuantity} {it.product.unit}
                            </td>

                            <td className="py-2 px-3 text-center">
                              {isChecking ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={state.receivedQuantity}
                                  onChange={(e) =>
                                    setCheckingItems({
                                      ...checkingItems,
                                      [it.id]: {
                                        ...state,
                                        receivedQuantity: parseInt(e.target.value, 10) || 0,
                                      },
                                    })
                                  }
                                  className="w-20 px-2 py-1 text-center font-mono font-bold border border-slate-300 rounded-sm bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                                />
                              ) : (
                                <span className="font-mono font-bold text-slate-900">
                                  {it.receivedQuantity} {it.product.unit}
                                </span>
                              )}
                            </td>

                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-bold ${
                                  difference === 0
                                    ? 'bg-slate-100 text-slate-700'
                                    : difference > 0
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {difference > 0 ? `+${difference}` : difference}
                              </span>
                            </td>

                            <td className="py-2 px-3">
                              {isChecking ? (
                                <select
                                  value={state.locationId || ''}
                                  onChange={(e) =>
                                    setCheckingItems({
                                      ...checkingItems,
                                      [it.id]: {
                                        ...state,
                                        locationId: e.target.value,
                                      },
                                    })
                                  }
                                  className="px-2 py-1 border border-slate-300 rounded-sm text-xs bg-white text-slate-800"
                                >
                                  {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                      {loc.code} ({loc.aisle}-{loc.rack})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200">
                                  <MapPin className="w-3 h-3 text-sky-700" />
                                  {it.location?.code || 'Padrão'}
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

              {/* Mensagens de Orientação de Workflow */}
              {selectedReceiving?.status === 'CHECKED' && (
                <div className="p-3 rounded-sm bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Recebimento conferido com sucesso. Os produtos estão prontos para serem alocados e armazenados no estoque físico.
                    </span>
                  </div>
                </div>
              )}

              {selectedReceiving?.status === 'STORED' && (
                <div className="p-3 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Recebimento totalmente armazenado em {new Date(selectedReceiving.storedAt!).toLocaleString('pt-BR')}. Entradas atômicas geradas no estoque.
                  </span>
                </div>
              )}
            </div>

            {/* Rodapé com Ações de Workflow */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                {canCancel && selectedReceiving && !['STORED', 'CANCELLED'].includes(selectedReceiving.status) && (
                  <button
                    onClick={handleCancelSubmit}
                    disabled={actionSubmitting}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-sm transition-colors"
                  >
                    Cancelar Recebimento
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-sm border border-slate-300 transition-colors"
                >
                  Fechar
                </button>

                {/* Passo 1 -> Iniciar Conferência */}
                {canOperate && selectedReceiving?.status === 'PENDING' && (
                  <button
                    onClick={handleStartChecking}
                    disabled={actionSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-sm transition-all disabled:opacity-50"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Iniciar Conferência Física</span>
                  </button>
                )}

                {/* Passo 2 -> Concluir Conferência */}
                {canOperate && selectedReceiving?.status === 'CHECKING' && (
                  <button
                    onClick={handleCheckSubmit}
                    disabled={actionSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-sm transition-all disabled:opacity-50"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Concluir Conferência</span>
                  </button>
                )}

                {/* Passo 3 -> Armazenar no Estoque */}
                {canOperate && selectedReceiving?.status === 'CHECKED' && (
                  <button
                    onClick={handleStoreSubmit}
                    disabled={actionSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-sm transition-all disabled:opacity-50"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Armazenar no Estoque</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
