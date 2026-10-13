import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Power,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Category, CreateProductInput, Location, Product } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';

export const ProductsPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canManageProducts = hasRole(['ADMIN', 'GERENTE']);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Estado do Modal (Novo / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    sku: '',
    categoryId: '',
    unit: 'UN',
    minStock: 10,
    locationId: '',
    description: '',
    weight: undefined,
    dimensions: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [prodsRes, catsRes, locsRes] = await Promise.all([
        api.getProducts({
          search: searchTerm,
          categoryId: selectedCategory,
          status: selectedStatus,
        }),
        api.getCategories(),
        api.getLocations(),
      ]);

      setProducts(prodsRes.products);
      setCategories(catsRes.categories);
      setLocations(locsRes.locations);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar catálogo de produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      categoryId: categories[0]?.id || '',
      unit: 'UN',
      minStock: 10,
      locationId: locations[0]?.id || '',
      description: '',
      weight: undefined,
      dimensions: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      unit: product.unit,
      minStock: product.minStock,
      locationId: product.locationId || '',
      description: product.description || '',
      weight: product.weight || undefined,
      dimensions: product.dimensions || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validações no frontend
    if (!formData.name.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }
    if (!formData.sku.trim()) {
      setFormError('O SKU/Código é obrigatório.');
      return;
    }
    if (!formData.categoryId) {
      setFormError('Selecione uma categoria.');
      return;
    }
    if (!formData.unit.trim()) {
      setFormError('Informe a unidade de medida.');
      return;
    }
    if (formData.minStock < 0) {
      setFormError('O estoque mínimo não pode ser negativo.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        setSuccessMessage(`Produto "${formData.name}" atualizado com sucesso!`);
      } else {
        await api.createProduct(formData);
        setSuccessMessage(`Produto "${formData.name}" cadastrado com sucesso!`);
      }

      setIsModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar produto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const nextStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmText =
      nextStatus === 'INACTIVE'
        ? `Deseja inativar o produto "${product.name}"? Produtos inativos não poderão receber novas movimentações.`
        : `Deseja reativar o produto "${product.name}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      await api.toggleProductStatus(product.id, nextStatus);
      setSuccessMessage(
        `Produto "${product.name}" foi ${nextStatus === 'ACTIVE' ? 'ativado' : 'inativado'} com sucesso!`
      );
      loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar status do produto');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <PageHeader
        title="Catálogo de Produtos"
        subtitle="Gerenciamento de SKUs, categorias, unidades e parâmetros de estocagem"
        icon={Package}
        actions={
          <>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
              title="Atualizar listagem"
              aria-label="Atualizar listagem de produtos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>

            {canManageProducts && (
              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Novo Produto</span>
              </button>
            )}
          </>
        }
      />

      {/* Alertas de Sucesso e Erro */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            aria-label="Fechar mensagem de sucesso"
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Fechar mensagem de erro"
            className="text-rose-600 hover:text-rose-800"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3 rounded-md border border-slate-200 flex flex-col md:flex-row gap-2.5 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            aria-label="Buscar produtos por nome ou SKU"
            placeholder="Buscar por nome ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" aria-hidden="true" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <select
            aria-label="Filtrar produtos por categoria"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar produtos por status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                <th scope="col" className="py-3 px-4">SKU / Código</th>
                <th scope="col" className="py-3 px-4">Produto</th>
                <th scope="col" className="py-3 px-4">Categoria</th>
                <th scope="col" className="py-3 px-4">Unidade</th>
                <th scope="col" className="py-3 px-4 text-center">Estoque Mínimo</th>
                <th scope="col" className="py-3 px-4">Localização Padrão</th>
                <th scope="col" className="py-3 px-4 text-center">Status</th>
                {canManageProducts && <th scope="col" className="py-3 px-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Carregando produtos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      product.status === 'INACTIVE' ? 'bg-slate-50/50 text-slate-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {product.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {product.category?.name || 'Geral'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {product.unit}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {product.minStock} {product.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {product.location ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200">
                          <MapPin className="w-3 h-3 text-sky-700" />
                          {product.location.code}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Não alocado</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={product.status} />
                    </td>

                    {canManageProducts && (
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            title="Editar produto"
                            aria-label={`Editar produto ${product.name}`}
                            className="p-1 text-slate-600 hover:text-sky-700 hover:bg-slate-100 rounded-sm transition-colors border border-transparent hover:border-slate-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(product)}
                            title={product.status === 'ACTIVE' ? 'Inativar produto' : 'Ativar produto'}
                            aria-label={
                              product.status === 'ACTIVE'
                                ? `Inativar produto ${product.name}`
                                : `Ativar produto ${product.name}`
                            }
                            className={`p-1 rounded-sm transition-colors border border-transparent hover:border-slate-200 ${
                              product.status === 'ACTIVE'
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 border-t border-slate-200 bg-slate-50/70 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Total cadastrado: {products.length} itens</span>
          <span className="text-slate-400">Armazém Geral</span>
        </div>
      </div>

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70"
        >
          <div className="bg-white rounded-md border border-slate-300 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 id="product-modal-title" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Fechar modal de produto"
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-3.5">
              {formError && (
                <div role="alert" className="p-2.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Caixa Papelão Kraft 40x30x25cm"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Código / SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ex: EMB-CX-040"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="LT">Litro (LT)</option>
                    <option value="PC">Peça (PC)</option>
                    <option value="FD">Fardo (FD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estoque Mínimo *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Localização Padrão
                  </label>
                  <select
                    value={formData.locationId || ''}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value || undefined })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="">Nenhuma / A definir</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code} (Corredor {loc.aisle}, Estante {loc.rack})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dimensões (LxAxP)
                  </label>
                  <input
                    type="text"
                    value={formData.dimensions || ''}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="Ex: 40x30x25 cm"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Descrição Detalhada
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Informações técnicas sobre o produto..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
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
                  disabled={submitting}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
