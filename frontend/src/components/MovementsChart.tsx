import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { MovementChartData } from '../types';

interface MovementsChartProps {
  data: MovementChartData[];
}

export const MovementsChart: React.FC<MovementsChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-md border border-slate-200 shadow-none flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Fluxo de Movimentação de Estoque
          </h3>
          <p className="text-[11px] text-slate-500">
            Comparativo de Entradas (Recebimento) vs. Saídas (Expedição) — 7 dias
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-semibold border border-slate-200">
          TEMPO REAL
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '4px',
                color: '#fff',
                border: '1px solid #334155',
                fontSize: '11px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="square"
            />
            <Bar dataKey="entradas" name="Entradas (Recebimento)" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
            <Bar dataKey="saídas" name="Saídas (Expedição)" fill="#64748b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
