'use client';

import { Infinity as InfinityIcon, Receipt } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { asPlanId } from '@/lib/plans';

export function PlanBadge({
  plan,
  size = 'sm',
  className = '',
}: {
  plan: string;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const { t } = useTranslation();

  const PLAN_CONFIG = {
    payg: {
      label: t('company.plan.payg'),
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      Icon: Receipt,
    },
    unlimited: {
      label: t('company.plan.unlimited'),
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      Icon: InfinityIcon,
    },
  };

  if (!plan) return null;
  const { label, color, bg, border, Icon } = PLAN_CONFIG[asPlanId(plan)];

  if (size === 'lg') {
    return (
      <div className={`inline-flex items-center gap-2 ${bg} ${border} border rounded-xl px-4 py-2 ${className}`}>
        <Icon className={`w-5 h-5 ${color}`} />
        <span className={`text-sm font-bold ${color}`}>{label}</span>
        <span className="text-xs text-brand-text-secondary font-medium">{t('company.plan.plan_label')}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${bg} ${border} border rounded-lg px-2.5 py-1 ${className}`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-xs font-semibold ${color}`}>{label}</span>
    </div>
  );
}
