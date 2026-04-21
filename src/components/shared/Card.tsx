import React from 'react';

type Props = {
  title?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'slate';
  children: React.ReactNode;
  className?: string;
};

const borderByColor = {
  blue: 'border-l-4 border-l-[#4F46E5]',
  green: 'border-l-4 border-l-emerald-500',
  orange: 'border-l-4 border-l-orange-500',
  purple: 'border-l-4 border-l-violet-500',
  slate: 'border-l-4 border-l-slate-400',
};

export function Card({ title, color = 'slate', children, className = '' }: Props) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${borderByColor[color]} ${className}`}>
      {title ? <h3 className="mb-4 text-lg font-bold text-slate-800">{title}</h3> : null}
      {children}
    </div>
  );
}
