import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  to?: string;
  badge?: {
    text: string;
    variant: 'neutral' | 'success' | 'warning' | 'danger';
  };
}

const BADGE_STYLES = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  to,
  badge,
}) => {
  const content = (
    <div
      className={`bg-white p-3.5 rounded-md border border-slate-200 shadow-none flex flex-col justify-between transition-colors h-full ${
        to
          ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/40 active:bg-slate-100/60'
          : 'hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </span>
        <div className="p-1 rounded-sm bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
          <Icon className="w-3.5 h-3.5 text-sky-700" />
        </div>
      </div>

      <div className="mt-2">
        <div className="text-xl font-bold text-slate-900 tracking-tight font-sans">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 gap-1">
          <span className="truncate">{subtitle}</span>
          {badge && (
            <span
              className={`px-1.5 py-0.2 rounded-sm text-[10px] font-semibold border shrink-0 ${BADGE_STYLES[badge.variant]}`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full focus:outline-none" title={`Acessar ${title}`}>
        {content}
      </Link>
    );
  }

  return content;
};
