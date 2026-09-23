import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  X,
  Filter,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { MovementInput, Product, StockMovement } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';

export const MovementsPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canRegisterMovement = hasRole(['ADMIN', 'GERENTE', 'OPERADOR']);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal de Nova Movimentação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<MovementInput>({
    productId: '',
    type: 'ENTRY',
    quantity: 1,
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [movsRes, prodsRes] = await Promise.all([
        api.getMovements({ type: selectedType }),
        api.getProducts(),
      ]);

      setMovements(movsRes.movements);
      setProducts(prodsRes.products);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar movimentações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedType]);

  const selectedProduct = products.find((p) => p.id === formData.productId);

  const openModal = (initialType: 'ENTRY' | 'EXIT' = 'ENTRY') => {
    // Escolher primeiro produto ativo
    const firstActiveProduct = products.find((p) => p.status === 'ACTIVE');

    setFormData({
      productId: firstActiveProduct?.id || products[0]?.id || '',
      type: initialType,
      quantity: 1,
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.productId) {
      setFormError('Selecione um produto.');
      return;
    }

    if (!selectedProduct) {
      setFormError('Produto inválido.');
      return;
    }

    // REGRA 1: Produto inativo
    if (selectedProduct.status === 'INACTIVE') {
      setFormError(
        `O produto "${selectedProduct.name}" está inativo no sistema e não pode receber movimentações de estoque.`
      );
      return;
    }

    // REGRA 2: Quantidade > 0
    const qty = parseInt(String(formData.quantity), 10);
    if (isNaN(qty) || qty <= 0) {
      setFormError('A quantidade deve ser um número inteiro maior que zero.');
      return;
    }

    // REGRA 3: Bloqueio estrito de estoque negativo
    if (formData.type === 'EXIT') {
      if (selectedProduct.currentStock < qty) {
        setFormError(
          `Estoque insuficiente! Saldo atual disponível: ${selectedProduct.currentStock} ${selectedProduct.unit}. Quantidade informada: ${qty} ${selectedProduct.unit}.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await api.registerMovement({
        ...formData,
        quantity: qty,
      });

      setSuccessMessage(
        `${formData.type === 'ENTRY' ? 'Entrada' : 'Saída'} registrada com sucesso! Novo saldo do produto: ${res.newStock} ${selectedProduct.unit}.`
      );
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao registrar movimentação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <PageHeader
        title="Movimentações de Estoque"
        subtitle="Rastreabilidade de entradas e saídas físicas com auditoria e usuário responsável"
        icon={ArrowRightLeft}
        actions={
          <>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
              title="Atualizar histórico"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {canRegisterMovement && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal('ENTRY')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-sm transition-colors"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Registrar Entrada</span>
                </button>

                <button
                  onClick={() => openModal('EXIT')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-600 rounded-sm transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Registrar Saída</span>
                </button>
              </div>
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
      <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">Tipo de Operação:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">Todas as Movimentações</option>
            <option value="ENTRY">Somente Entradas (Recebimento)</option>
            <option value="EXIT">Somente Saídas (Expedição)</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {movements.length} movimentações registradas
        </span>
      </div>

      {/* Tabela de Histórico */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3 text-center">Tipo</th>
                <th className="py-2.5 px-3">SKU / Produto</th>
                <th className="py-2.5 px-3 text-center">Quantidade</th>
                <th className="py-2.5 px-3">Usuário Responsável</th>
                <th className="py-2.5 px-3">Origem / Destino</th>
                <th className="py-2.5 px-3">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Carregando movimentações...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Nenhuma movimentação registrada até o momento.
                  </td>
                </tr>
              ) : (
                movements.map((mov) => {
                  const isEntry = mov.type === 'ENTRY';

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {new Date(mov.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={mov.type} />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {mov.product?.name || 'Produto'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          SKU: {mov.product?.sku}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isEntry ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isEntry ? '+' : '-'}
                          {mov.quantity} {mov.product?.unit || 'UN'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{mov.user?.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Perfil: {mov.user?.role}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        <div>{mov.origin || '—'}</div>
                        <div className="text-slate-400">→ {mov.destination || '—'}</div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                        {mov.notes || 'Sem observações'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 border-t border-slate-200 bg-slate-50/70 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Histórico de Auditoria Imutável • {movements.length} registros</span>
          <span className="text-slate-400">Armazém Geral</span>
        </div>
      </div>

      {/* Modal de Registro de Movimentação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white rounded-md border border-slate-300 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-sky-700" />
                Registrar Movimentação de Estoque
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-3.5">
              {formError && (
                <div className="p-2.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tipo de Movimentação */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Operação *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'ENTRY' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border text-xs font-bold transition-all ${
                      formData.type === 'ENTRY'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Entrada (Recebimento)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'EXIT' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border text-xs font-bold transition-all ${
                      formData.type === 'EXIT'
                        ? 'bg-rose-700 text-white border-rose-700'
                        : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Saída (Expedição)
                  </button>
                </div>
              </div>

              {/* Produto */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Selecionar Produto *
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                >
                  <option value="">Selecione um produto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.status === 'INACTIVE'}>
                      {p.sku} - {p.name} (Saldo: {p.currentStock} {p.unit})
                      {p.status === 'INACTIVE' ? ' [INATIVO]' : ''}
                    </option>
                  ))}
                </select>

                {selectedProduct && (
                  <div className="mt-2 p-2 rounded-sm bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Saldo Físico Atual</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {selectedProduct.currentStock} {selectedProduct.unit}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Estoque Mínimo</span>
                      <span className="font-medium text-slate-600">
                        {selectedProduct.minStock} {selectedProduct.unit}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Quantidade a Movimentar *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                />

                {/* Validação dinâmica de saída superior ao estoque */}
                {formData.type === 'EXIT' &&
                  selectedProduct &&
                  formData.quantity > selectedProduct.currentStock && (
                    <div className="mt-1.5 p-2 rounded-sm bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Quantidade solicitada ({formData.quantity}) excede o saldo disponível ({selectedProduct.currentStock}).
                      </span>
                    </div>
                  )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações / Justificativa
                </label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Recebimento de NF 5491 / Pedido de cliente #001..."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-sm border border-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (formData.type === 'EXIT' &&
                      selectedProduct &&
                      formData.quantity > selectedProduct.currentStock)
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Registrando...' : 'Confirmar Movimentação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
