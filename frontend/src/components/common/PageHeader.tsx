import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  icon: Icon,
  actions,
}) => {
  const desc = description || subtitle;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-md border border-slate-200">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-sm bg-slate-900 text-white border border-slate-800 shrink-0">
            <Icon className="w-4.5 h-4.5 text-sky-400" />
          </div>
        )}
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
            {title}
          </h1>
          {desc && (
            <p className="text-xs text-slate-500 mt-0.5 leading-normal">
              {desc}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
