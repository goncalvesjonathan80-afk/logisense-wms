import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { AlertItem } from '../types';

interface RecentAlertsProps {
  alerts: AlertItem[];
}

export const RecentAlerts: React.FC<RecentAlertsProps> = ({ alerts }) => {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'CRÍTICO',
          borderLeft: 'border-l-rose-500',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'ATENÇÃO',
          borderLeft: 'border-l-amber-500',
        };
      default:
        return {
          badge: 'bg-sky-50 text-sky-700 border-sky-200',
          label: 'INFORMATIVO',
          borderLeft: 'border-l-sky-500',
        };
    }
  };

  return (
    <div className="bg-white p-4 rounded-md border border-slate-200 shadow-none flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Alertas Operacionais Recentes
          </h2>
          <p className="text-[11px] text-slate-500">
            Eventos do armazém que demandam ação ou monitoramento
          </p>
        </div>
        <Link
          to="/monitoramento"
          className="text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors inline-flex items-center gap-1"
          title="Ver alertas no módulo de monitoramento"
        >
          <span>{alerts.length} ativos</span>
          <span className="text-slate-400 font-normal">→</span>
        </Link>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-72 custom-scrollbar pr-1">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Nenhum alerta operacional pendente.
          </div>
        ) : (
          alerts.map((alert) => {
            const style = getSeverityStyle(alert.severity);

            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded-sm border border-slate-200 bg-slate-50/70 border-l-2 ${style.borderLeft} text-xs`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm border ${style.badge}`}>
                    {style.label}
                  </span>
                  {alert.area && (
                    <span className="text-[10px] font-semibold text-slate-600 bg-white px-1.5 py-0.2 rounded-sm border border-slate-200">
                      {`Área ${String(alert.area).replace(/^(?:[aá]rea\s+)+/i, '').trim()}`}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 ml-auto font-mono">
                    {new Date(alert.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="font-semibold text-slate-800 mt-1">
                  {alert.title}
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  {alert.message}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
