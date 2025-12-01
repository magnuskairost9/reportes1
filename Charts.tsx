import React from 'react';
import { LoanData, STATUS_ORDER } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, PieChart, Pie
} from 'recharts';

interface ChartsProps {
  data: LoanData[];
}

// Fix #3: Neon Palette
const NEON_COLORS = [
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#39FF14', // Neon Green
  '#FFF01F', // Bright Yellow
  '#1F51FF', // Electric Blue
  '#FF3131', // Neon Red
  '#CCFF00', // Lime
  '#BC13FE', // Neon Purple
];

export const Charts: React.FC<ChartsProps> = ({ data }) => {
  
  // 1. Process data for Grouped Bar Chart
  const processBarData = () => {
    const monthlyData: Record<string, any> = {};
    const presentStatuses = new Set<string>();

    data.forEach(item => {
      const date = new Date(item.creationDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { name: monthKey };
      }
      
      if (!monthlyData[monthKey][item.status]) {
        monthlyData[monthKey][item.status] = 0;
      }
      monthlyData[monthKey][item.status]++;
      presentStatuses.add(item.status);
    });

    const chartData = Object.values(monthlyData).sort((a, b) => a.name.localeCompare(b.name));
    const sortedStatuses = Array.from(presentStatuses).sort((a, b) => {
        return STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b);
    });

    return { chartData, statuses: sortedStatuses };
  };

  // 2. Process data for Donut Chart
  const processPieData = () => {
      const counts: Record<string, number> = {};
      data.forEach(item => {
          counts[item.status] = (counts[item.status] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => STATUS_ORDER.indexOf(a.name) - STATUS_ORDER.indexOf(b.name));
  };

  // 3. Process data for Top Advisors
  const processAdvisorData = () => {
    const advisorStats: Record<string, number> = {};
    data.filter(d => d.status === 'Entregada').forEach(item => {
      const advisor = item.advisor || 'Sin Asignar';
      advisorStats[advisor] = (advisorStats[advisor] || 0) + item.amount;
    });

    return Object.entries(advisorStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  // 4. Process data for Time Chart
  const processTimeData = () => {
      const stageStats: Record<string, { totalDays: number, count: number }> = {};
      
      data.forEach(item => {
          if (!stageStats[item.status]) {
              stageStats[item.status] = { totalDays: 0, count: 0 };
          }
          stageStats[item.status].totalDays += item.daysElapsed;
          stageStats[item.status].count += 1;
      });

      return Object.entries(stageStats)
        .map(([name, stats]) => ({
            name,
            avgDays: stats.totalDays / stats.count
        }))
        .sort((a, b) => STATUS_ORDER.indexOf(a.name) - STATUS_ORDER.indexOf(b.name));
  };

  const { chartData, statuses } = processBarData();
  const pieData = processPieData();
  const advisorData = processAdvisorData();
  const timeData = processTimeData();

  // FIX #1: High Contrast Tooltip Style for Recharts
  const tooltipStyle = {
    contentStyle: { 
        backgroundColor: '#1f2937', // Dark Gray (Slate-800)
        borderColor: '#4b5563', // Border Gray
        color: '#ffffff', // Explicit White Text
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    },
    itemStyle: { 
        color: '#ffffff' // Explicit White Text for items
    },
    labelStyle: {
        color: '#e2e8f0', // Light Gray for title/label
        fontWeight: 600
    },
    cursor: {
        fill: 'rgba(255,255,255,0.05)',
        stroke: '#4b5563'
    }
  };

  return (
    <div className="flex flex-col gap-6 mb-6">
      {/* Row 1: Trends & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Grouped Bar Chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-6 tracking-wide">Evolución por Mes</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  {...tooltipStyle}
                />
                <Legend />
                {statuses.map((status, index) => (
                  <Bar key={status} dataKey={status} fill={NEON_COLORS[index % NEON_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Donut Chart with % Labels */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-6 tracking-wide">Distribución de Estatus</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ percent, name }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={{ stroke: '#64748b' }}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={NEON_COLORS[index % NEON_COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                            ))}
                        </Pie>
                        <Tooltip 
                            {...tooltipStyle}
                        />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Row 2: Performance & Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Advisor Ranking (Multicolor) */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-6 tracking-wide">Ranking Asesores (Monto Entregado)</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={advisorData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{fontSize: 12}} />
                <Tooltip 
                  {...tooltipStyle}
                  formatter={(value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                   {advisorData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={NEON_COLORS[index % NEON_COLORS.length]} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-6 tracking-wide">Promedio de Días por Etapa</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        angle={-45} 
                        textAnchor="end" 
                        interval={0}
                        height={60}
                        tick={{fontSize: 10}}
                    />
                    <YAxis stroke="#94a3b8" label={{ value: 'Días', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}/>
                    <Tooltip 
                        {...tooltipStyle}
                        formatter={(value: number) => [`${value.toFixed(1)} días`, 'Promedio']}
                    />
                    <Bar dataKey="avgDays" radius={[4, 4, 0, 0]}>
                         {timeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={NEON_COLORS[(index + 3) % NEON_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};