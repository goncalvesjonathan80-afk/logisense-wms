import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  MapPin,
  Package,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Category, StockItem } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';

export const StockPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canMoveStock = hasRole(['ADMIN', 'GERENTE', 'OPERADOR']);

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const loadStock = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stockRes, catRes] = await Promise.all([
        api.getStock({
          search: searchTerm,
          categoryId: selectedCategory,
          status: selectedStatus,
        }),
        api.getCategories(),
      ]);

      setStockItems(stockRes.stock);
      setCategories(catRes.categories);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar posição de estoque');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStock();
  };

  // Métricas rápidas calculadas diretamente dos dados reais do banco
  const totalUnits = stockItems.reduce((acc, item) => acc + item.quantity, 0);
  const lowStockItems = stockItems.filter((item) => item.status === 'ESTOQUE_BAIXO').length;
  const outOfStockItems = stockItems.filter((item) => item.status === 'SEM_ESTOQUE').length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <PageHeader
        title="Posição Geral de Estoque"
        subtitle="Saldo físico real armazenado no galpão, controle de níveis mínimos e endereçamento"
        icon={Boxes}
        actions={
          <>
            <button
              onClick={loadStock}
              disabled={loading}
              className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
              title="Atualizar saldos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {canMoveStock && (
              <Link
                to="/estoque/movimentacoes"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-sm transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Registrar Movimentação</span>
              </Link>
            )}
          </>
        }
      />

      {/* Cards de Resumo (Filtros Interativos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setSelectedStatus('ALL')}
          className={`text-left p-3.5 rounded-md border shadow-none flex items-center justify-between transition-colors cursor-pointer select-none ${
            selectedStatus === 'ALL'
              ? 'bg-slate-50/80 border-slate-400'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
          }`}
          title="Ver todos os itens monitorados"
        >
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Itens Monitorados</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5 font-sans">{stockItems.length}</div>
            <span className="text-[11px] text-slate-400">SKUs com controle ativo</span>
          </div>
          <div className="p-1.5 rounded-sm bg-slate-50 text-slate-600 border border-slate-200">
            <Package className="w-4 h-4 text-sky-700" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('ALL')}
          className="text-left bg-white p-3.5 rounded-md border border-slate-200 shadow-none flex items-center justify-between transition-colors cursor-pointer select-none hover:border-slate-300 hover:bg-slate-50/40"
          title="Saldo total de unidades"
        >
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Unidades Físicas</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5 font-sans">{totalUnits.toLocaleString('pt-BR')}</div>
            <span className="text-[11px] text-emerald-700 font-semibold">Saldo consolidado</span>
          </div>
          <div className="p-1.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Boxes className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'ESTOQUE_BAIXO' ? 'ALL' : 'ESTOQUE_BAIXO')}
          className={`text-left p-3.5 rounded-md border shadow-none flex items-center justify-between transition-colors cursor-pointer select-none ${
            selectedStatus === 'ESTOQUE_BAIXO'
              ? 'bg-amber-50/50 border-amber-400 ring-1 ring-amber-400/40'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
          }`}
          title="Filtrar produtos com estoque baixo"
        >
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estoque Baixo</span>
            <div className="text-xl font-bold text-amber-700 mt-0.5 font-sans">{lowStockItems}</div>
            <span className="text-[11px] text-amber-700 font-semibold">Abaixo do mínimo</span>
          </div>
          <div className="p-1.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'SEM_ESTOQUE' ? 'ALL' : 'SEM_ESTOQUE')}
          className={`text-left p-3.5 rounded-md border shadow-none flex items-center justify-between transition-colors cursor-pointer select-none ${
            selectedStatus === 'SEM_ESTOQUE'
              ? 'bg-rose-50/50 border-rose-400 ring-1 ring-rose-400/40'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
          }`}
          title="Filtrar produtos sem estoque"
        >
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sem Estoque</span>
            <div className="text-xl font-bold text-rose-700 mt-0.5 font-sans">{outOfStockItems}</div>
            <span className="text-[11px] text-rose-700 font-semibold">Saldo zerado</span>
          </div>
          <div className="p-1.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-4 h-4" />
          </div>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadStock} className="underline font-semibold hover:text-rose-900">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white p-3 rounded-md border border-slate-200 flex flex-col md:flex-row gap-2.5 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por produto ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="NORMAL">Normal</option>
            <option value="ESTOQUE_BAIXO">Estoque Baixo</option>
            <option value="SEM_ESTOQUE">Sem Estoque</option>
          </select>
        </div>
      </div>

      {/* Tabela de Estoque */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Produto</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Localização</th>
                <th className="py-2.5 px-3 text-center">Quantidade Atual</th>
                <th className="py-2.5 px-3 text-center">Estoque Mínimo</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Última Movimentação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && stockItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Carregando estoque...
                  </td>
                </tr>
              ) : stockItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Nenhum registro de estoque encontrado.
                  </td>
                </tr>
              ) : (
                stockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      {item.sku}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      {item.productStatus === 'INACTIVE' && (
                        <span className="text-[10px] text-rose-500 font-semibold">
                          (Inativo no catálogo)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200 text-slate-700">
                        <MapPin className="w-3 h-3 text-sky-700" />
                        {item.location}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-semibold text-slate-900">
                        {item.quantity.toLocaleString('pt-BR')} {item.unit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 text-[11px] font-mono">
                      {new Date(item.lastMovement).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 border-t border-slate-200 bg-slate-50/70 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            Exibindo <strong>{stockItems.length}</strong> produtos
          </span>
          <span className="text-slate-400">
            Regra de Integridade: O saldo só pode ser alterado através do registro formal de movimentações.
          </span>
        </div>
      </div>
    </div>
  );
};
