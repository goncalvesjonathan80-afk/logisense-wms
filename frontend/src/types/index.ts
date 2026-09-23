export type UserRole = 'ADMIN' | 'GERENTE' | 'OPERADOR' | 'CONSULTA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  active?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DemoAccount {
  name: string;
  email: string;
  role: UserRole;
  department: string;
  suggestedPassword: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  _count?: { products: number };
}

export interface Location {
  id: string;
  code: string;
  aisle: string;
  rack: string;
  shelf: string;
  capacity: number;
  status: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  categoryId: string;
  category: { id: string; name: string };
  unit: string;
  weight?: number | null;
  dimensions?: string | null;
  minStock: number;
  currentStock: number;
  locationId?: string | null;
  location?: { id: string; code: string; aisle: string; rack: string; shelf: string } | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
}

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId: string;
  quantity: number;
  minStock: number;
  unit: string;
  location: string;
  locationId?: string | null;
  productStatus: 'ACTIVE' | 'INACTIVE';
  status: 'NORMAL' | 'ESTOQUE_BAIXO' | 'SEM_ESTOQUE';
  lastMovement: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  product: { id: string; sku: string; name: string; unit: string; currentStock?: number };
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  userId: string;
  user: { id: string; name: string; role: UserRole };
  origin?: string | null;
  destination?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  categoryId: string;
  unit: string;
  minStock: number;
  locationId?: string;
  description?: string;
  weight?: number;
  dimensions?: string;
}

export interface MovementInput {
  productId: string;
  type: 'ENTRY' | 'EXIT';
  quantity: number;
  notes?: string;
  origin?: string;
  destination?: string;
}

// Fase 3: Recebimento e Armazenagem
export type ReceivingStatus = 'PENDING' | 'CHECKING' | 'CHECKED' | 'STORED' | 'CANCELLED';

export interface ReceivingItem {
  id: string;
  receivingId: string;
  productId: string;
  product: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    currentStock: number;
    status: 'ACTIVE' | 'INACTIVE';
  };
  expectedQuantity: number;
  receivedQuantity: number;
  locationId?: string | null;
  location?: {
    id: string;
    code: string;
    aisle: string;
    rack: string;
    shelf: string;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Receiving {
  id: string;
  receivingNumber: string;
  supplier: string;
  status: ReceivingStatus;
  notes?: string | null;
  userId: string;
  user: {
    id: string;
    name: string;
    role: UserRole;
    department?: string | null;
  };
  checkedAt?: string | null;
  checkedBy?: string | null;
  storedAt?: string | null;
  storedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: ReceivingItem[];
  _count?: { items: number };
}

export interface CreateReceivingInput {
  supplier: string;
  notes?: string;
  items?: Array<{
    productId: string;
    expectedQuantity: number;
    locationId?: string;
  }>;
}

// Fase 4: Pedidos, Picking e Expedição
export type OrderStatus = 'PENDING' | 'PICKING' | 'PICKED' | 'SHIPPED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    currentStock: number;
    minStock?: number;
    status: 'ACTIVE' | 'INACTIVE';
    location?: { id: string; code: string } | null;
  };
  requestedQuantity: number;
  pickedQuantity: number;
  locationId?: string | null;
  location?: {
    id: string;
    code: string;
    aisle: string;
    rack: string;
    shelf: string;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName?: string | null;
  customer?: string | null;
  status: OrderStatus;
  notes?: string | null;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    role: UserRole;
    department?: string | null;
  } | null;
  pickedAt?: string | null;
  pickedBy?: string | null;
  shippedAt?: string | null;
  shippedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  _count?: { items: number };
}

export interface CreateOrderInput {
  customerName: string;
  notes?: string;
  items: Array<{
    productId: string;
    requestedQuantity: number;
    locationId?: string;
  }>;
}

export interface DashboardCards {
  totalProducts: number;
  totalStockQuantity: number;
  lowStockCount: number;
  todayEntries: number;
  todayExits: number;
  pendingOrdersCount: number;
  ordersPending?: number;
  ordersPicking?: number;
  ordersPicked?: number;
  ordersShippedToday?: number;
  activeAlertsCount: number;
  activeIoTAlertsCount?: number;
  areasInAlertCount?: number;
  pendingReceivingsCount?: number;
  storedReceivingsToday?: number;
}

export interface MovementChartData {
  date: string;
  entradas: number;
  saídas: number;
}

export interface CategoryChartData {
  name: string;
  total: number;
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  module: string;
  area?: string | null;
  type?: 'TEMPERATURA' | 'UMIDADE' | null;
  detectedValue?: number | null;
  limitValue?: number | null;
  status?: 'OPEN' | 'RESOLVED';
  resolved: boolean;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
}

export interface IoTReadingItem {
  id: string;
  area: string;
  temperature: number;
  humidity: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  isSimulated: boolean;
}

export interface DashboardData {
  cards: DashboardCards;
  charts: {
    movements: MovementChartData[];
    categories: CategoryChartData[];
  };
  recentAlerts: AlertItem[];
  iotSummary: IoTReadingItem[];
}

// Fase 5: Relatórios
export interface ReportStockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
  location: string;
  status: 'NORMAL' | 'ESTOQUE_BAIXO' | 'SEM_ESTOQUE';
}

export interface ReportMovementItem {
  id: string;
  date: string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'TRANSFER';
  productName: string;
  productSku: string;
  quantity: number;
  unit: string;
  userName: string;
  origin: string;
  destination: string;
  notes: string;
}

export interface ReportReceivingItem {
  id: string;
  receivingNumber: string;
  supplier: string;
  createdAt: string;
  status: string;
  totalItems: number;
  userName: string;
  checkedBy: string;
  storedAt?: string | null;
  storedBy: string;
  notes: string;
}

export interface ReportOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  createdAt: string;
  status: string;
  totalItems: number;
  userName: string;
  pickedBy: string;
  shippedAt?: string | null;
  shippedBy: string;
  notes: string;
}
