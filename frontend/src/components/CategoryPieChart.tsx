import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { CategoryChartData } from '../types';

interface CategoryPieChartProps {
  data: CategoryChartData[];
}

const COLORS = ['#0284c7', '#0d9488', '#6366f1', '#f59e0b', '#ec4899'];

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-md border border-slate-200 shadow-none flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Estoque Físico por Categoria
          </h3>
          <p className="text-[11px] text-slate-500">
            Distribuição de unidades físicas armazenadas no galpão
          </p>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 11, fill: '#334155' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '4px',
                color: '#fff',
                border: '1px solid #334155',
                fontSize: '11px',
              }}
              formatter={(value: any) => [`${value} unidades`, 'Total']}
            />
            <Bar dataKey="total" radius={[0, 2, 2, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
