import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { StockPage } from './pages/StockPage';
import { MovementsPage } from './pages/MovementsPage';
import { ReceivingsPage } from './pages/ReceivingsPage';
import { OrdersPage } from './pages/OrdersPage';
import { PickingPage } from './pages/PickingPage';
import { ExpedicaoPage } from './pages/ExpedicaoPage';
import { IoTPage } from './pages/IoTPage';
import { ReportsPage } from './pages/ReportsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { MainLayout } from './layouts/MainLayout';
import {
  ArrowDownLeft,
  Layers,
  CheckSquare,
  ArrowUpRight,
  Package,
  Boxes,
  MapPin,
  ClipboardList,
  ShoppingCart,
  Activity,
  FileBarChart,
  Users,
  Settings,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, canAccessRoute } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex items-center justify-center bg-slate-900 text-white"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <span className="text-xs text-slate-300">Carregando LOGISENSE WMS...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Verificar permissão RBAC para a rota atual
  if (!canAccessRoute(location.pathname)) {
    return (
      <div
        role="alert"
        className="bg-white p-8 rounded-xl border border-rose-200 shadow-sm max-w-lg mx-auto my-12 text-center"
      >
        <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600 mb-4" aria-hidden="true">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Acesso Restrito por Perfil (RBAC)</h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          Seu perfil atual de acesso (<strong>{user.role}</strong>) não possui permissão para visualizar este módulo.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Para acessar, entre com uma conta com perfil de privilégio adequado (ex: GERENTE ou ADMIN).
        </p>
        <Link
          to="/dashboard"
          className="inline-block mt-5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-500 transition-colors"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Operações */}
            <Route path="operacoes/recebimento" element={<ReceivingsPage />} />
            <Route path="operacoes/pedidos" element={<OrdersPage />} />
            <Route path="operacoes/picking" element={<PickingPage />} />
            <Route path="operacoes/expedicao" element={<ExpedicaoPage />} />

            <Route
              path="operacoes/armazenagem"
              element={
                <PlaceholderPage
                  title="Armazenagem (Put-away)"
                  category="Operações"
                  description="Alocação inteligente de mercadorias recebidas nos endereços e posições físicas do armazém conforme capacidade e giro."
                  icon={Layers}
                  plannedFeatures={[
                    'Mapeamento de posições disponíveis nos corredores A e B',
                    'Alocação de lotes recebidos para as estantes do porta-paletes',
                    'Registro da movimentação interna de alocação',
                  ]}
                  backendEndpoint="GET /api/locations"
                  allowedRoles={['ADMIN', 'GERENTE', 'OPERADOR']}
                />
              }
            />

            {/* Estoque */}
            <Route path="estoque/produtos" element={<ProductsPage />} />
            <Route path="estoque/saldo" element={<StockPage />} />
            <Route path="estoque/movimentacoes" element={<MovementsPage />} />

            <Route
              path="estoque/localizacoes"
              element={
                <PlaceholderPage
                  title="Estrutura de Armazém & Localizações"
                  category="Estoque"
                  description="Representação tridimensional e hierárquica do armazém (Corredor, Estante, Posição - Ex: A-01-01, B-02-03)."
                  icon={MapPin}
                  plannedFeatures={[
                    'Estrutura hierárquica: Corredor / Estante / Posição',
                    'Controle de capacidade máxima e status da posição',
                    'Mapa visual do armazém de 1.500 m²',
                  ]}
                  backendEndpoint="GET /api/locations"
                  allowedRoles={['ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA']}
                />
              }
            />

            <Route
              path="estoque/inventario"
              element={
                <PlaceholderPage
                  title="Inventário Cíclico & Auditoria Física"
                  category="Estoque"
                  description="Contagem física de itens, conferência com saldo do sistema, cálculo automático de divergências e movimentações de ajuste."
                  icon={ClipboardList}
                  plannedFeatures={[
                    'Seleção de endereço/localização para contagem',
                    'Exibição do saldo sistêmico vs. contagem física informada',
                    'Cálculo de delta (+/-)',
                    'Lançamento automático de movimentação de Ajuste de Estoque com justificativa',
                  ]}
                  backendEndpoint="POST /api/stock/adjustment"
                  allowedRoles={['ADMIN', 'GERENTE']}
                />
              }
            />

            {/* Outros Módulos */}
            {/* Redirecionamento amigável de /pedidos */}
            <Route path="pedidos" element={<Navigate to="/operacoes/pedidos" replace />} />

            <Route path="monitoramento" element={<IoTPage />} />
            <Route path="operacoes/iot" element={<IoTPage />} />

            <Route path="relatorios" element={<ReportsPage />} />

            <Route
              path="usuarios"
              element={
                <PlaceholderPage
                  title="Gerenciamento de Usuários & Perfis"
                  category="Administração"
                  description="Controle de usuários, departamentos e permissões RBAC (ADMIN, GERENTE, OPERADOR, CONSULTA)."
                  icon={Users}
                  plannedFeatures={[
                    'Listagem de usuários cadastrados no armazém',
                    'Atribuição de papéis (RBAC) e departamentos',
                    'Ativação/Desativação de credenciais de acesso',
                  ]}
                  backendEndpoint="GET /api/users"
                  allowedRoles={['ADMIN']}
                />
              }
            />

            <Route
              path="auditoria"
              element={
                <PlaceholderPage
                  title="Trilha de Auditoria do Sistema"
                  category="Segurança & Compliance"
                  description="Registro detalhado e imutável de todas as ações críticas executadas: login, alterações de estoque, produtos e acessos."
                  icon={ShieldCheck}
                  plannedFeatures={[
                    'Log com Usuário, Ação, Módulo, IP e Data/Hora',
                    'Filtros por período e tipo de ação',
                    'Garantia de rastreabilidade para auditorias internas',
                  ]}
                  backendEndpoint="GET /api/audit-logs"
                  allowedRoles={['ADMIN']}
                />
              }
            />

            <Route
              path="configuracoes"
              element={
                <PlaceholderPage
                  title="Configurações do Armazém"
                  category="Sistema"
                  description="Parâmetros gerais de operação: dimensões do galpão (1.500 m²), impressoras, gateways de rede e limites de tolerância."
                  icon={Settings}
                  plannedFeatures={[
                    'Configuração da área física e setores (Administração, Estoque, Expedição, TI)',
                    'Configuração de limites dos alertas ambientais',
                    'Parâmetros de retenção de logs e segurança',
                  ]}
                  backendEndpoint="GET /api/settings"
                  allowedRoles={['ADMIN']}
                />
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
