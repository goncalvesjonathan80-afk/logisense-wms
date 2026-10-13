import React, { useState, useEffect } from 'react';
import {
  Activity,
  Thermometer,
  Droplets,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  ShieldCheck,
  Check,
  Filter,
  Info,
  Clock,
  MapPin,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { AlertItem, IoTReadingItem } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';

export const IoTPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canOperate = hasRole(['ADMIN', 'GERENTE', 'OPERADOR']);

  const [activeTab, setActiveTab] = useState<'alerts' | 'telemetry'>('alerts');
  const [latestReadings, setLatestReadings] = useState<IoTReadingItem[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<IoTReadingItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [selectedAlertStatus, setSelectedAlertStatus] = useState<'OPEN' | 'RESOLVED' | 'ALL'>('OPEN');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [latestRes, historyRes, alertsRes] = await Promise.all([
        api.getLatestTelemetry(),
        api.getTelemetry({
          area: selectedAreaFilter !== 'ALL' ? selectedAreaFilter : undefined,
          limit: 30,
        }),
        api.getAlerts({
          status: selectedAlertStatus !== 'ALL' ? selectedAlertStatus : undefined,
          area: selectedAreaFilter !== 'ALL' ? selectedAreaFilter : undefined,
        }),
      ]);

      setLatestReadings(latestRes.latest || []);
      setSummary(latestRes.summary || null);
      setTelemetryHistory(historyRes.readings || []);
      setAlerts(alertsRes.alerts || []);
    } catch (err: any) {
      console.error('Erro ao carregar dados IoT:', err);
      setError(err.message || 'Falha ao carregar dados de telemetria e alertas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAreaFilter, selectedAlertStatus]);

  // Simular Nova Leitura
  const handleSimulate = async () => {
    try {
      setSimulating(true);
      setError(null);
      const res = await api.simulateTelemetry();

      const alertsCount = res.alertsCreated?.length || 0;
      if (alertsCount > 0) {
        setSuccessMessage(
          `Novas leituras geradas com sucesso! ⚠️ ${alertsCount} alerta(s) de limite disparado(s).`
        );
      } else {
        setSuccessMessage('Novas leituras de telemetria registradas com sucesso (todas na faixa ideal).');
      }
      setTimeout(() => setSuccessMessage(null), 6000);

      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar nova leitura simulada.');
    } finally {
      setSimulating(false);
    }
  };

  // Resolver Alerta
  const handleResolveAlert = async (alertId: string) => {
    try {
      setResolvingId(alertId);
      setError(null);
      const res = await api.resolveAlert(alertId);
      setSuccessMessage(res.message || 'Alerta resolvido com sucesso!');
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao resolver alerta.');
    } finally {
      setResolvingId(null);
    }
  };

  const formatAreaLabel = (area?: string | null) => {
    if (!area) return 'Armazém';
    const stripped = String(area).replace(/^(?:[aá]rea\s+)+/i, '').trim();
    return stripped ? `Área ${stripped}` : 'Armazém';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Monitoramento Ambiental (IoT)"
        subtitle="Telemetria contínua de temperatura e umidade das zonas de armazenagem com detecção e governança de alertas"
        icon={Activity}
        actions={
          <>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors"
              title="Atualizar leituras"
              aria-label="Atualizar leituras de telemetria e alertas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>

            {canOperate && (
              <button
                type="button"
                onClick={handleSimulate}
                disabled={simulating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded-sm shadow-none transition-colors disabled:opacity-50"
              >
                <Cpu className={`w-3.5 h-3.5 text-sky-400 ${simulating ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>{simulating ? 'Gerando Leituras...' : 'Gerar Nova Leitura'}</span>
              </button>
            )}
          </>
        }
      />

      {/* Nota Acadêmica PIM III - Mantida exclusivamente na telemetria IoT */}
      <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-sm uppercase tracking-wider shrink-0">
            DADOS SIMULADOS — PIM III
          </span>
          <span className="text-slate-600">
            Sensores simulados em malha fechada (Sensor &rarr; Wi-Fi &rarr; Gateway &rarr; API &rarr; Banco &rarr; Dashboard). Limites operacionais: Temperatura (18 °C a 30 °C) e Umidade (40% a 70%).
          </span>
        </div>
      </div>

      {/* Mensagens de Sucesso ou Erro */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-between text-emerald-950 text-xs"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            aria-label="Fechar mensagem de sucesso"
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-2.5 bg-rose-50 border border-rose-300 rounded-md flex items-center justify-between text-rose-950 text-xs"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Fechar mensagem de erro"
            className="text-rose-700 hover:text-rose-900"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-md border border-slate-200 shadow-none">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Áreas Monitoradas</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">3 Zonas</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Áreas A, B e C</p>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200 border-l-2 border-l-emerald-600 shadow-none">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sensores Ativos</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">6 Sensores</p>
          <p className="text-[11px] text-slate-500 mt-0.5">3 Temp + 3 Umidade</p>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200 border-l-2 border-l-amber-600 shadow-none">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Alertas em Aberto</p>
          <p className="text-xl font-bold text-amber-700 mt-0.5">
            {summary?.openAlerts ?? alerts.filter((a) => a.status === 'OPEN').length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Exigem intervenção técnica</p>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200 border-l-2 border-l-sky-600 shadow-none">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Faixas Ideais</p>
          <p className="text-xs font-bold text-slate-900 font-mono mt-1">18–30 °C | 40–70%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Norma técnica de armazenagem</p>
        </div>
      </div>

      {/* Grid das Áreas A, B e C */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {latestReadings.map((reading) => {
          const isWarning = reading.status === 'WARNING';
          const isCritical = reading.status === 'CRITICAL';

          return (
            <div
              key={reading.id}
              className={`bg-white p-3.5 rounded-md border transition-all shadow-none ${
                isCritical
                  ? 'border-rose-300 bg-rose-50/20'
                  : isWarning
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <span className="font-bold text-slate-900 text-xs tracking-wide">
                    {formatAreaLabel(reading.area)}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase border ${
                    isCritical
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : isWarning
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}
                >
                  {isCritical ? 'Crítico' : isWarning ? 'Alerta' : 'Normal'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <div className="bg-slate-50 p-2.5 rounded-sm border border-slate-200">
                  <div className="flex items-center space-x-1 text-slate-600 mb-0.5">
                    <Thermometer className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                    <span className="text-[10px] uppercase font-semibold">Temperatura</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 font-mono">
                    {reading.temperature.toFixed(1).replace('.', ',')} °C
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Faixa: 18 - 30 °C</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-sm border border-slate-200">
                  <div className="flex items-center space-x-1 text-slate-600 mb-0.5">
                    <Droplets className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                    <span className="text-[10px] uppercase font-semibold">Umidade</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 font-mono">
                    {reading.humidity.toFixed(0)}%
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Faixa: 40 - 70%</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2.5 pt-2 text-[10px] text-slate-500 border-t border-slate-100">
                <span className="font-mono">Sensor Telemetry</span>
                <span className="font-mono">
                  {new Date(reading.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Seletor de Abas: Alertas vs Histórico de Telemetria */}
      <div className="bg-white rounded-md border border-slate-200 shadow-none overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 border-b border-slate-200 bg-slate-50">
          <div className="flex space-x-4" role="tablist" aria-label="Abas de monitoramento IoT">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'alerts'}
              onClick={() => setActiveTab('alerts')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'alerts'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span>Central de Alertas de Ambiente ({alerts.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'telemetry'}
              onClick={() => setActiveTab('telemetry')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'telemetry'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
              <span>Histórico de Telemetria</span>
            </button>
          </div>

          {/* Filtros Contextuais */}
          <div className="flex items-center space-x-3 pb-2.5">
            <div className="flex items-center space-x-1 text-xs text-slate-600">
              <Filter className="w-3 h-3 text-slate-400" aria-hidden="true" />
              <label htmlFor="iot-area-filter" className="font-medium">Área:</label>
              <select
                id="iot-area-filter"
                aria-label="Filtrar por área monitorada"
                value={selectedAreaFilter}
                onChange={(e) => setSelectedAreaFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-sm font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todas as Áreas</option>
                <option value="Área A">Área A</option>
                <option value="Área B">Área B</option>
                <option value="Área C">Área C</option>
              </select>
            </div>

            {activeTab === 'alerts' && (
              <div className="flex items-center space-x-1 text-xs text-slate-600">
                <label htmlFor="iot-status-filter" className="font-medium">Status:</label>
                <select
                  id="iot-status-filter"
                  aria-label="Filtrar alertas por status"
                  value={selectedAlertStatus}
                  onChange={(e) => setSelectedAlertStatus(e.target.value as any)}
                  className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-sm font-medium text-slate-700 focus:outline-none"
                >
                  <option value="OPEN">Em Aberto</option>
                  <option value="RESOLVED">Resolvidos</option>
                  <option value="ALL">Todos os Alertas</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo da Aba 1: Alertas */}
        {activeTab === 'alerts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-3 py-2.5">Área</th>
                  <th scope="col" className="px-3 py-2.5">Tipo</th>
                  <th scope="col" className="px-3 py-2.5">Evento Detectado</th>
                  <th scope="col" className="px-3 py-2.5 text-center">Valor / Limite</th>
                  <th scope="col" className="px-3 py-2.5">Data/Hora</th>
                  <th scope="col" className="px-3 py-2.5">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" aria-hidden="true" />
                      <p className="font-semibold text-slate-700">Nenhum alerta pendente</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Todos os sensores estão operando dentro das faixas normais.
                      </p>
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => {
                    const isOpen = alert.status === 'OPEN';
                    return (
                      <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          {formatAreaLabel(alert.area)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center space-x-1 font-semibold text-slate-700">
                            {alert.type === 'TEMPERATURA' ? (
                              <Thermometer className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                            ) : (
                              <Droplets className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
                            )}
                            <span>{alert.type || 'Ambiente'}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-slate-900 block">{alert.title}</span>
                          <span className="text-[11px] text-slate-500">{alert.message}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          {alert.detectedValue !== null && alert.detectedValue !== undefined ? (
                            <span className="font-bold text-slate-900">
                              {alert.detectedValue}
                              {alert.type === 'TEMPERATURA' ? ' °C' : '%'}
                            </span>
                          ) : (
                            '-'
                          )}
                          {alert.limitValue !== null && alert.limitValue !== undefined ? (
                            <span className="text-slate-400 block text-[10px]">
                              Limite: {alert.limitValue}
                              {alert.type === 'TEMPERATURA' ? ' °C' : '%'}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">
                          {new Date(alert.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={alert.status} />
                          {!isOpen && alert.resolvedBy && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                              por {alert.resolvedBy}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {isOpen ? (
                            canOperate ? (
                              <button
                                type="button"
                                onClick={() => handleResolveAlert(alert.id)}
                                disabled={resolvingId === alert.id}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded-sm shadow-none transition-colors disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                                <span>{resolvingId === alert.id ? 'Resolvendo...' : 'Resolver'}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Somente leitura</span>
                            )
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-medium">Concluído</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Conteúdo da Aba 2: Telemetria Histórica */}
        {activeTab === 'telemetry' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-3 py-2.5">Data / Hora</th>
                  <th scope="col" className="px-3 py-2.5">Área Monitorada</th>
                  <th scope="col" className="px-3 py-2.5 text-center">Temperatura</th>
                  <th scope="col" className="px-3 py-2.5 text-center">Umidade Relativa</th>
                  <th scope="col" className="px-3 py-2.5 text-center">Condição</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {telemetryHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                      Nenhuma leitura registrada no histórico.
                    </td>
                  </tr>
                ) : (
                  telemetryHistory.map((reading) => {
                    return (
                      <tr key={reading.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">
                          {new Date(reading.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          {formatAreaLabel(reading.area)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900">
                          {reading.temperature.toFixed(1).replace('.', ',')} °C
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900">
                          {reading.humidity.toFixed(0)}%
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <StatusBadge status={reading.status} />
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-500">
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-sm text-[10px] font-mono">
                            DADOS SIMULADOS — PIM III
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
