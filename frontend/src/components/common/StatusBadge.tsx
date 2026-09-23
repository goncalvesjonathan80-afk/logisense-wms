import React from 'react';

export type StatusType =
  // Produtos
  | 'ACTIVE'
  | 'INACTIVE'
  // Estoque
  | 'NORMAL'
  | 'ESTOQUE_BAIXO'
  | 'SEM_ESTOQUE'
  // Recebimentos
  | 'PENDING'
  | 'CHECKING'
  | 'CHECKED'
  | 'STORED'
  // Pedidos
  | 'PICKING'
  | 'PICKED'
  | 'SHIPPED'
  | 'CANCELLED'
  // Alertas / IoT
  | 'OPEN'
  | 'RESOLVED'
  | 'CRITICAL'
  | 'WARNING'
  | 'INFO'
  // Movimentações
  | 'ENTRY'
  | 'EXIT'
  | 'ADJUSTMENT'
  // Localizações
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | string;

interface StatusBadgeProps {
  status?: StatusType | null;
  label?: string;
  size?: 'sm' | 'md';
}

interface BadgeConfig {
  label: string;
  className: string;
  dotColor?: string;
}

const STATUS_CONFIGS: Record<string, BadgeConfig> = {
  // Positivos (Verde corporativo sutil)
  ACTIVE: { label: 'Ativo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  STORED: { label: 'Armazenado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  SHIPPED: { label: 'Expedido', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  NORMAL: { label: 'Normal', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  RESOLVED: { label: 'Resolvido', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  AVAILABLE: { label: 'Disponível', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  ENTRY: { label: 'Entrada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },

  // Neutros / Informativos (Azul / Slate)
  CHECKING: { label: 'Em Conferência', className: 'bg-sky-50 text-sky-700 border-sky-200', dotColor: 'bg-sky-500' },
  CHECKED: { label: 'Conferido', className: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' },
  PICKED: { label: 'Separado', className: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' },
  OCCUPIED: { label: 'Ocupado', className: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' },
  INFO: { label: 'Informativo', className: 'bg-sky-50 text-sky-700 border-sky-200', dotColor: 'bg-sky-500' },

  // Alerta / Atenção (Âmbar corporativo)
  PENDING: { label: 'Pendente', className: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  PICKING: { label: 'Em Separação', className: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  ESTOQUE_BAIXO: { label: 'Estoque Baixo', className: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  WARNING: { label: 'Atenção', className: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  OPEN: { label: 'Em Aberto', className: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  MAINTENANCE: { label: 'Manutenção', className: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },

  // Críticos / Inativos (Vermelho / Rose corporativo)
  INACTIVE: { label: 'Inativo', className: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
  SEM_ESTOQUE: { label: 'Sem Estoque', className: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
  CANCELLED: { label: 'Cancelado', className: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
  CRITICAL: { label: 'Crítico', className: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
  EXIT: { label: 'Saída', className: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'NORMAL',
  label,
  size = 'sm',
}) => {
  const safeStatus = status || 'NORMAL';
  const normalizedKey = safeStatus.toUpperCase();
  const config = STATUS_CONFIGS[normalizedKey] || {
    label: label || safeStatus,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-400',
  };

  const displayText = label || config.label;
  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider border rounded-sm ${paddingClass} ${config.className} transition-colors select-none`}
    >
      {config.dotColor && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} />
      )}
      <span>{displayText}</span>
    </span>
  );
};
