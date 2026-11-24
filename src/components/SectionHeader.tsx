import React from 'react';

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  tone?: 'brand' | 'emerald' | 'rose' | 'amber';
}

const TONE_MAP: Record<NonNullable<SectionHeaderProps['tone']>, string> = {
  brand: 'bg-[#1E62D0]/10 text-[#1E62D0]',
  emerald: 'bg-emerald-500/12 text-emerald-700',
  rose: 'bg-rose-500/12 text-rose-700',
  amber: 'bg-amber-500/12 text-amber-700',
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  extra,
  tone = 'brand',
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex items-start gap-2.5 min-w-0">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE_MAP[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-[15px] font-semibold text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {extra && <div className="shrink-0">{extra}</div>}
    </div>
  );
};
