import React from 'react';
import { LucideIcon, Layers, ShieldCheck, ArrowRight, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PlaceholderPageProps {
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  plannedFeatures: string[];
  backendEndpoint?: string;
  allowedRoles: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  category,
  description,
  icon: Icon,
  plannedFeatures,
  backendEndpoint,
  allowedRoles,
}) => {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Módulo */}
      <div className="bg-white p-4 rounded-md border border-slate-200 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-sm bg-slate-900 text-white">
            <Icon className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {category}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] text-slate-400">Módulo LOGISENSE WMS</span>
            </div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
              {title}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Layers className="w-3 h-3" />
            Previsto no Roadmap
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <Database className="w-3 h-3 text-emerald-600" />
            Schema no Banco Pronto
          </span>
        </div>
      </div>

      {/* Conteúdo Informativo de Arquitetura e Especificação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-4 rounded-md border border-slate-200 shadow-none space-y-3">
          <h2 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
            <span>Especificações Funcionais Planejadas</span>
          </h2>
          <p className="text-xs text-slate-500">
            Este módulo faz parte da arquitetura modular do LOGISENSE WMS e está registrado no catálogo operacional:
          </p>

          <ul className="space-y-2 mt-2">
            {plannedFeatures.map((feat, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-sm border border-slate-200"
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Governança e Informações Técnicas */}
        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-none space-y-3">
          <h2 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Permissões & API</span>
          </h2>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] font-medium">Seu Perfil Atual</span>
              <span className="font-bold text-slate-900">
                {user?.role} ({user?.name})
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] font-medium">Perfis Autorizados</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {allowedRoles.map((role) => (
                  <span
                    key={role}
                    className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {backendEndpoint && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block text-[11px] font-medium">Endpoint REST Preparado</span>
                <code className="text-[11px] bg-slate-900 text-slate-200 px-2 py-1 rounded-sm block mt-1 font-mono break-all border border-slate-800">
                  {backendEndpoint}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
