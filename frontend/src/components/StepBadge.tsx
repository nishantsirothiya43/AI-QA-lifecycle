interface StepBadgeProps {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label?: string;
}

const STEP_LABELS: Record<StepBadgeProps['step'], string> = {
  1: 'Generate',
  2: 'Manual',
  3: 'Review',
  4: 'Script',
  5: 'Approve',
  6: 'Execute',
  7: 'Analyze',
};

export default function StepBadge({ step, label }: StepBadgeProps) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        border: '1px solid var(--border-bright)',
        borderRadius: 6,
        padding: '2px 8px',
        color: 'var(--accent-amber)',
      }}
    >
      {step} {label ?? STEP_LABELS[step]}
    </span>
  );
}
