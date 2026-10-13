import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Download,
  Filter,
  RefreshCw,
  Search,
  Boxes,
  ArrowRightLeft,
  ArrowDownLeft,
  Truck,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import {
  Category,
  ReportMovementItem,
  ReportOrderItem,
  ReportReceivingItem,
  ReportStockItem,
} from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'receivings' | 'orders'>('stock');

  // Dados dos Relatórios
  const [stockData, setStockData] = useState<ReportStockItem[]>([]);
  const [movementsData, setMovementsData] = useState<ReportMovementItem[]>([]);
  const [receivingsData, setReceivingsData] = useState<ReportReceivingItem[]>([]);
  const [ordersData, setOrdersData] = useState<ReportOrderItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros - Estoque
  const [stockCategory, setStockCategory] = useState('ALL');
  const [stockStatus, setStockStatus] = useState('ALL');

  // Filtros - Movimentações
  const [movType, setMovType] = useState('ALL');
  const [movStartDate, setMovStartDate] = useState('');
  const [movEndDate, setMovEndDate] = useState('');

  // Filtros - Recebimentos
  const [recStatus, setRecStatus] = useState('ALL');

  // Filtros - Expedições
  const [orderStatus, setOrderStatus] = useState('ALL');

  // Carregar Categorias uma vez
  useEffect(() => {
    api.getCategories().then((res) => setCategories(res.categories || []));
  }, []);

  // Carregar dados conforme aba ativa e filtros
  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'stock') {
        const res = await api.getReportStock({
          categoryId: stockCategory !== 'ALL' ? stockCategory : undefined,
          status: stockStatus !== 'ALL' ? stockStatus : undefined,
        });
        setStockData(res.report || []);
      } else if (activeTab === 'movements') {
        const res = await api.getReportMovements({
          type: movType !== 'ALL' ? movType : undefined,
          startDate: movStartDate || undefined,
          endDate: movEndDate || undefined,
        });
        setMovementsData(res.report || []);
      } else if (activeTab === 'receivings') {
        const res = await api.getReportReceivings({
          status: recStatus !== 'ALL' ? recStatus : undefined,
        });
        setReceivingsData(res.report || []);
      } else if (activeTab === 'orders') {
        const res = await api.getReportOrders({
          status: orderStatus !== 'ALL' ? orderStatus : undefined,
        });
        setOrdersData(res.report || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar relatório:', err);
      setError(err.message || 'Falha ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, stockCategory, stockStatus, movType, movStartDate, movEndDate, recStatus, orderStatus]);

  // Exportar CSV via URL com token
  const handleExportCsv = (endpoint: string, queryParams: Record<string, string>) => {
    const params = new URLSearchParams(queryParams);
    params.append('format', 'csv');
    const token = localStorage.getItem('logisense_token');

    // Fazer download via fetch com cabeçalho de autenticação
    fetch(`/api${endpoint}?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => {
        console.error('Erro ao baixar CSV:', err);
        alert('Falha ao exportar arquivo CSV.');
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Relatórios Operacionais & Gerenciais"
        subtitle="Visualização consolidada e exportação tabular em formato CSV para auditoria e controle de armazém"
        icon={FileBarChart}
        actions={
          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
            title="Atualizar relatório"
            aria-label="Atualizar dados do relatório"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        }
      />

      {error && (
        <div role="alert" className="p-2.5 bg-rose-50 border border-rose-300 rounded-md text-xs text-rose-950 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Navegação entre os 4 Relatórios */}
      <div className="bg-white rounded-md border border-slate-200 shadow-none overflow-hidden">
        <div
          role="tablist"
          aria-label="Categorias de relatórios"
          className="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold bg-slate-50"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stock'}
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'stock'
                ? 'border-slate-900 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" aria-hidden="true" />
            <span>1. Posição de Estoque</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'movements'}
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'movements'
                ? 'border-slate-900 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>2. Movimentações</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'receivings'}
            onClick={() => setActiveTab('receivings')}
            className={`px-4 py-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'receivings'
                ? 'border-slate-900 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>3. Recebimentos</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'orders'
                ? 'border-slate-900 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>4. Expedições & Pedidos</span>
          </button>
        </div>

        {/* Barra de Filtros e Ação de Exportação CSV */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Filtros da Aba Estoque */}
            {activeTab === 'stock' && (
              <>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-medium">Categoria:</span>
                  <select
                    value={stockCategory}
                    onChange={(e) => setStockCategory(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-sm font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Todas as Categorias</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-medium">Situação:</span>
                  <select
                    value={stockStatus}
                    onChange={(e) => setStockStatus(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-sm font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Todos os Saldos</option>
                    <option value="NORMAL">Normal</option>
                    <option value="ESTOQUE_BAIXO">Estoque Baixo</option>
                    <option value="SEM_ESTOQUE">Sem Estoque</option>
                  </select>
                </div>
              </>
            )}

            {/* Filtros da Aba Movimentações */}
            {activeTab === 'movements' && (
              <>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-medium">Tipo:</span>
                  <select
                    value={movType}
                    onChange={(e) => setMovType(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-sm font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Todas as Movimentações</option>
                    <option value="ENTRY">Entrada (Recebimento)</option>
                    <option value="EXIT">Saída (Expedição)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-medium">De:</span>
                  <input
                    type="date"
                    value={movStartDate}
                    onChange={(e) => setMovStartDate(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-sm text-slate-700 font-mono text-xs"
                  />
                  <span className="text-slate-500 font-medium">Até:</span>
                  <input
                    type="date"
                    value={movEndDate}
                    onChange={(e) => setMovEndDate(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-sm text-slate-700 font-mono text-xs"
                  />
                </div>
              </>
            )}

            {/* Filtros da Aba Recebimentos */}
            {activeTab === 'receivings' && (
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  value={recStatus}
                  onChange={(e) => setRecStatus(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-sm font-medium text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="PENDING">Pendente</option>
                  <option value="CHECKING">Em Conferência</option>
                  <option value="CHECKED">Conferido</option>
                  <option value="STORED">Armazenado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
            )}

            {/* Filtros da Aba Expedições */}
            {activeTab === 'orders' && (
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-sm font-medium text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="PENDING">Pendente</option>
                  <option value="PICKING">Em Separação</option>
                  <option value="PICKED">Conferido (Pronto)</option>
                  <option value="SHIPPED">Expedido</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
            )}
          </div>

          {/* Botão de Exportação CSV */}
          <button
            onClick={() => {
              if (activeTab === 'stock') {
                handleExportCsv('/reports/stock', {
                  categoryId: stockCategory !== 'ALL' ? stockCategory : '',
                  status: stockStatus !== 'ALL' ? stockStatus : '',
                });
              } else if (activeTab === 'movements') {
                handleExportCsv('/reports/movements', {
                  type: movType !== 'ALL' ? movType : '',
                  startDate: movStartDate,
                  endDate: movEndDate,
                });
              } else if (activeTab === 'receivings') {
                handleExportCsv('/reports/receivings', {
                  status: recStatus !== 'ALL' ? recStatus : '',
                });
              } else if (activeTab === 'orders') {
                handleExportCsv('/reports/orders', {
                  status: orderStatus !== 'ALL' ? orderStatus : '',
                });
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-sm font-semibold border border-slate-900 shadow-none transition-colors shrink-0 text-xs"
            title="Download de arquivo CSV formatado para planilhas"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Exportar CSV</span>
          </button>
        </div>

        {/* Tabelas dos Relatórios */}
        <div className="overflow-x-auto">
          {/* TABELA 1: ESTOQUE */}
          {activeTab === 'stock' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">Produto</th>
                  <th className="px-3 py-2.5">Categoria</th>
                  <th className="px-3 py-2.5 text-center">Saldo Atual</th>
                  <th className="px-3 py-2.5 text-center">Mínimo</th>
                  <th className="px-3 py-2.5">Localização</th>
                  <th className="px-3 py-2.5 text-right">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stockData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      Nenhum produto atende aos filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  stockData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{item.sku}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{item.name}</td>
                      <td className="px-3 py-2.5 text-slate-600">{item.category}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-900 font-mono">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500 font-mono">
                        {item.minStock} {item.unit}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{item.location}</td>
                      <td className="px-3 py-2.5 text-right">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TABELA 2: MOVIMENTAÇÕES */}
          {activeTab === 'movements' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Data / Hora</th>
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5">Produto / SKU</th>
                  <th className="px-3 py-2.5 text-center">Quantidade</th>
                  <th className="px-3 py-2.5">Operador</th>
                  <th className="px-3 py-2.5">Origem &rarr; Destino</th>
                  <th className="px-3 py-2.5">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {movementsData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      Nenhuma movimentação registrada no período.
                    </td>
                  </tr>
                ) : (
                  movementsData.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">
                        {new Date(m.date).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={m.type} />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-slate-900 block">{m.productName}</span>
                        <span className="text-[11px] font-mono text-slate-500">{m.productSku}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-900 font-mono">
                        {m.quantity} {m.unit}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{m.userName}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700 text-xs">
                        {m.origin} &rarr; {m.destination}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 max-w-xs truncate">{m.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TABELA 3: RECEBIMENTOS */}
          {activeTab === 'receivings' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Número</th>
                  <th className="px-3 py-2.5">Fornecedor</th>
                  <th className="px-3 py-2.5">Data Cadastro</th>
                  <th className="px-3 py-2.5 text-center">Itens</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Conferente / Armazenador</th>
                  <th className="px-3 py-2.5 text-right">Data Armazenagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {receivingsData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      Nenhum recebimento encontrado.
                    </td>
                  </tr>
                ) : (
                  receivingsData.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                        {r.receivingNumber}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{r.supplier}</td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">
                        {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800">
                        {r.totalItems} item(ns)
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {r.storedBy && r.storedBy !== '-'
                          ? r.storedBy
                          : r.checkedBy && r.checkedBy !== '-'
                          ? r.checkedBy
                          : r.userName}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">
                        {r.storedAt ? new Date(r.storedAt).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TABELA 4: EXPEDIÇÕES */}
          {activeTab === 'orders' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Pedido</th>
                  <th className="px-3 py-2.5">Cliente / Destino</th>
                  <th className="px-3 py-2.5">Data Cadastro</th>
                  <th className="px-3 py-2.5 text-center">Itens</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Separador (Picking)</th>
                  <th className="px-3 py-2.5 text-right">Data Expedição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ordersData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      Nenhuma expedição encontrada.
                    </td>
                  </tr>
                ) : (
                  ordersData.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                        {o.orderNumber}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{o.customerName}</td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">
                        {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800">
                        {o.totalItems} item(ns)
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{o.pickedBy}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">
                        {o.shippedAt ? new Date(o.shippedAt).toLocaleString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
