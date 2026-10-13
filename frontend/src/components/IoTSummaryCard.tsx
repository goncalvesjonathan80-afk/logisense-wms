import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Thermometer, Droplets, Info } from 'lucide-react';
import { IoTReadingItem } from '../types';
import { StatusBadge } from './common/StatusBadge';

interface IoTSummaryCardProps {
  readings: IoTReadingItem[];
}

export const IoTSummaryCard: React.FC<IoTSummaryCardProps> = ({ readings }) => {
  return (
    <div className="bg-white p-4 rounded-md border border-slate-200 shadow-none flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-sm bg-slate-900 text-white shrink-0">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Monitoramento Ambiental (IoT)
            </h2>
            <p className="text-[11px] text-slate-500">
              Telemetria de sensores por zona de armazenagem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 uppercase tracking-wide">
            <Info className="w-3 h-3 text-amber-600" />
            DADOS SIMULADOS — PIM III
          </span>
          <Link
            to="/monitoramento"
            className="text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors inline-flex items-center gap-1"
            title="Acessar painel de telemetria"
          >
            <span>Painel</span>
            <span className="text-slate-400 font-normal">→</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {readings.length === 0 ? (
          <div className="col-span-3 py-6 text-center text-xs text-slate-400">
            Nenhuma telemetria registrada no momento.
          </div>
        ) : (
          readings.map((reading) => {
            const cleanArea = `Área ${String(reading.area || 'A').replace(/^(?:[aá]rea\s+)+/i, '').trim()}`;
            return (
              <div
                key={reading.id}
                className="p-3 rounded-sm border border-slate-200 bg-slate-50/70 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    {cleanArea}
                  </span>
                  <StatusBadge status={reading.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">Temp</span>
                      <span className="font-semibold text-slate-800 font-mono text-xs">
                        {reading.temperature.toFixed(1).replace('.', ',')} °C
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">Umidade</span>
                      <span className="font-semibold text-slate-800 font-mono text-xs">
                        {reading.humidity.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
