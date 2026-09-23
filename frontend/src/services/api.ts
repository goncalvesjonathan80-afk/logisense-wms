import {
  AlertItem,
  AuthResponse,
  Category,
  CreateOrderInput,
  CreateProductInput,
  CreateReceivingInput,
  DashboardData,
  DemoAccount,
  IoTReadingItem,
  Location,
  MovementInput,
  Order,
  OrderItem,
  Product,
  Receiving,
  ReceivingItem,
  ReportMovementItem,
  ReportOrderItem,
  ReportReceivingItem,
  ReportStockItem,
  StockItem,
  StockMovement,
  User,
} from '../types';

const VITE_API_URL = (import.meta.env.VITE_API_URL as string | undefined) || '';
const API_BASE = VITE_API_URL ? `${VITE_API_URL.replace(/\/$/, '')}/api` : '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('logisense_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('logisense_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('logisense_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Tratamento de sessão: limpar credencial em caso de token expirado ou não autorizado
    if (response.status === 401 && endpoint !== '/auth/login') {
      removeAuthToken();
    }
    throw new Error(data.message || `Erro na requisição (${response.status})`);
  }

  return data as T;
}

export const api = {
  // Autenticação
  login: (email: string, password: string): Promise<AuthResponse> =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: (): Promise<{ user: User }> => request<{ user: User }>('/auth/me'),

  getDemoAccounts: (): Promise<{ accounts: DemoAccount[] }> =>
    request<{ accounts: DemoAccount[] }>('/auth/demo-accounts'),

  // Dashboard
  getDashboardStats: (): Promise<DashboardData> =>
    request<DashboardData>('/dashboard/stats'),

  // Categorias & Localizações
  getCategories: (): Promise<{ categories: Category[] }> =>
    request<{ categories: Category[] }>('/categories'),

  getLocations: (): Promise<{ locations: Location[] }> =>
    request<{ locations: Location[] }>('/locations'),

  // Produtos
  getProducts: (params?: { search?: string; categoryId?: string; status?: string }): Promise<{ products: Product[] }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return request<{ products: Product[] }>(`/products${qs ? `?${qs}` : ''}`);
  },

  getProductById: (id: string): Promise<{ product: Product }> =>
    request<{ product: Product }>(`/products/${id}`),

  createProduct: (data: CreateProductInput): Promise<{ message: string; product: Product }> =>
    request<{ message: string; product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: Partial<CreateProductInput>): Promise<{ message: string; product: Product }> =>
    request<{ message: string; product: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleProductStatus: (id: string, status?: 'ACTIVE' | 'INACTIVE'): Promise<{ message: string; product: Product }> =>
    request<{ message: string; product: Product }>(`/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Estoque
  getStock: (params?: { search?: string; categoryId?: string; status?: string }): Promise<{ stock: StockItem[] }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return request<{ stock: StockItem[] }>(`/stock${qs ? `?${qs}` : ''}`);
  },

  // Movimentações
  getMovements: (params?: { type?: string; limit?: number }): Promise<{ movements: StockMovement[] }> => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ movements: StockMovement[] }>(`/stock/movements${qs ? `?${qs}` : ''}`);
  },

  registerMovement: (data: MovementInput): Promise<{ message: string; movement: StockMovement; newStock: number }> =>
    request<{ message: string; movement: StockMovement; newStock: number }>('/stock/movements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Fase 3: Recebimento e Armazenagem
  getReceivings: (params?: { status?: string; search?: string }): Promise<{ receivings: Receiving[] }> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return request<{ receivings: Receiving[] }>(`/receivings${qs ? `?${qs}` : ''}`);
  },

  getReceivingById: (id: string): Promise<{ receiving: Receiving }> =>
    request<{ receiving: Receiving }>(`/receivings/${id}`),

  createReceiving: (data: CreateReceivingInput): Promise<{ message: string; receiving: Receiving }> =>
    request<{ message: string; receiving: Receiving }>('/receivings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addReceivingItem: (
    receivingId: string,
    item: { productId: string; expectedQuantity: number; locationId?: string }
  ): Promise<{ message: string; item: ReceivingItem }> =>
    request<{ message: string; item: ReceivingItem }>(`/receivings/${receivingId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  startChecking: (receivingId: string): Promise<{ message: string; receiving: Receiving }> =>
    request<{ message: string; receiving: Receiving }>(`/receivings/${receivingId}/start-checking`, {
      method: 'POST',
    }),

  checkReceiving: (
    receivingId: string,
    items: Array<{ id: string; receivedQuantity: number; locationId?: string }>
  ): Promise<{ message: string; receiving: Receiving }> =>
    request<{ message: string; receiving: Receiving }>(`/receivings/${receivingId}/check`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  storeReceiving: (
    receivingId: string
  ): Promise<{ message: string; receiving: Receiving; storedUnits: number; storedItems: number }> =>
    request<{ message: string; receiving: Receiving; storedUnits: number; storedItems: number }>(
      `/receivings/${receivingId}/store`,
      { method: 'POST' }
    ),

  cancelReceiving: (receivingId: string): Promise<{ message: string; receiving: Receiving }> =>
    request<{ message: string; receiving: Receiving }>(`/receivings/${receivingId}/cancel`, {
      method: 'PATCH',
    }),

  // Fase 4: Pedidos, Picking e Expedição
  getOrders: (params?: { status?: string; search?: string }): Promise<{ orders: Order[] }> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return request<{ orders: Order[] }>(`/orders${qs ? `?${qs}` : ''}`);
  },

  getOrderById: (id: string): Promise<{ order: Order }> =>
    request<{ order: Order }>(`/orders/${id}`),

  createOrder: (data: CreateOrderInput): Promise<{ message: string; order: Order }> =>
    request<{ message: string; order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addOrderItem: (
    orderId: string,
    item: { productId: string; requestedQuantity: number; locationId?: string }
  ): Promise<{ message: string; item: OrderItem }> =>
    request<{ message: string; item: OrderItem }>(`/orders/${orderId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  startPicking: (orderId: string): Promise<{ message: string; order: Order }> =>
    request<{ message: string; order: Order }>(`/orders/${orderId}/start-picking`, {
      method: 'POST',
    }),

  pickOrder: (
    orderId: string,
    items: Array<{ id: string; pickedQuantity: number; locationId?: string }>
  ): Promise<{ message: string; order: Order }> =>
    request<{ message: string; order: Order }>(`/orders/${orderId}/pick`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  shipOrder: (
    orderId: string
  ): Promise<{ message: string; order: Order; totalPicked: number; itemsShipped: number }> =>
    request<{ message: string; order: Order; totalPicked: number; itemsShipped: number }>(
      `/orders/${orderId}/ship`,
      { method: 'POST' }
    ),

  cancelOrder: (orderId: string): Promise<{ message: string; order: Order }> =>
    request<{ message: string; order: Order }>(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
    }),

  // Fase 5: IoT & Telemetria
  getTelemetry: (params?: {
    area?: string;
    limit?: number;
  }): Promise<{ readings: IoTReadingItem[]; isSimulated: boolean; notice: string }> => {
    const query = new URLSearchParams();
    if (params?.area) query.append('area', params.area);
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ readings: IoTReadingItem[]; isSimulated: boolean; notice: string }>(
      `/iot/telemetry${qs ? `?${qs}` : ''}`
    );
  },

  getLatestTelemetry: (): Promise<{ latest: IoTReadingItem[]; summary: any }> =>
    request<{ latest: IoTReadingItem[]; summary: any }>('/iot/telemetry/latest'),

  simulateTelemetry: (data?: {
    area?: string;
    temperature?: number;
    humidity?: number;
  }): Promise<{ message: string; readings: IoTReadingItem[]; alertsCreated: AlertItem[] }> =>
    request<{ message: string; readings: IoTReadingItem[]; alertsCreated: AlertItem[] }>(
      '/iot/telemetry/simulate',
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    ),

  getAlerts: (params?: {
    status?: string;
    area?: string;
    type?: string;
  }): Promise<{ alerts: AlertItem[] }> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.area) query.append('area', params.area);
    if (params?.type) query.append('type', params.type);
    const qs = query.toString();
    return request<{ alerts: AlertItem[] }>(`/iot/alerts${qs ? `?${qs}` : ''}`);
  },

  resolveAlert: (id: string): Promise<{ message: string; alert: AlertItem }> =>
    request<{ message: string; alert: AlertItem }>(`/iot/alerts/${id}/resolve`, {
      method: 'PATCH',
    }),

  // Fase 5: Relatórios
  getReportStock: (params?: {
    categoryId?: string;
    status?: string;
  }): Promise<{ report: ReportStockItem[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return request<{ report: ReportStockItem[]; total: number }>(`/reports/stock${qs ? `?${qs}` : ''}`);
  },

  getReportMovements: (params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ report: ReportMovementItem[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const qs = query.toString();
    return request<{ report: ReportMovementItem[]; total: number }>(
      `/reports/movements${qs ? `?${qs}` : ''}`
    );
  },

  getReportReceivings: (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ report: ReportReceivingItem[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const qs = query.toString();
    return request<{ report: ReportReceivingItem[]; total: number }>(
      `/reports/receivings${qs ? `?${qs}` : ''}`
    );
  },

  getReportOrders: (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ report: ReportOrderItem[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const qs = query.toString();
    return request<{ report: ReportOrderItem[]; total: number }>(
      `/reports/orders${qs ? `?${qs}` : ''}`
    );
  },

  // Outros módulos
  getIoTReadings: (): Promise<any> => request('/iot/readings'),
  getAuditLogs: (): Promise<any> => request('/audit-logs'),
  getUsers: (): Promise<any> => request('/users'),
};
