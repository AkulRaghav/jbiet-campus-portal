'use client';

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface AttendancePieChartProps {
  present: number;
  absent: number;
  title?: string;
}

const COLORS = ['#10b981', '#ef4444'];

export default function AttendancePieChart({ present, absent, title }: AttendancePieChartProps) {
  const data = [
    { name: 'Present', value: present },
    { name: 'Absent', value: absent },
  ];

  const total = present + absent;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="text-center">
      {title && <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>}
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={24} />
        </PieChart>
      </ResponsiveContainer>
      <p className={`text-lg font-bold ${percentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
        {percentage}%
      </p>
    </div>
  );
}
