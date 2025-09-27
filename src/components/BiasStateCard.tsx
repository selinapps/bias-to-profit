import { cn } from '@/lib/utils';
import { biasLabels, biasTone, marketStateLabels, marketStateTone, toneClasses } from '@/types/bias';
import type { BiasStateSnapshot } from '@/types/bias';
import { Pencil } from 'lucide-react';

interface BiasStateCardProps {
  value?: BiasStateSnapshot | null;
  onEdit: () => void;
  isCompact?: boolean;
  loading?: boolean;
}

const Pill = ({ label, tone }: { label: string; tone: keyof typeof toneClasses }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-tight',
      toneClasses[tone]
    )}
  >
    {label}
  </span>
);

export function BiasStateCard({ value, onEdit, isCompact = false, loading }: BiasStateCardProps) {
  const showValue = Boolean(value);

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-2xl border border-slate-700/50 bg-slate-900/60 px-4',
        isCompact ? 'py-3' : 'py-4'
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-100">Bias &amp; Market State</span>
        {loading ? (
          <span className="text-xs text-slate-400">Loading…</span>
        ) : showValue ? (
          <>
            <Pill label={biasLabels[value!.bias]} tone={biasTone[value!.bias]} />
            {value?.market_state ? (
              <Pill label={marketStateLabels[value.market_state]} tone={marketStateTone[value.market_state]} />
            ) : (
              <Pill label="State: Not set" tone="zinc" />
            )}
          </>
        ) : (
          <span className="text-xs text-slate-400">Not set</span>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/10 hover:text-indigo-200"
      >
        <Pencil className="h-3.5 w-3.5" />
        {showValue ? 'Edit' : 'Set bias/state'}
      </button>
    </div>
  );
}
