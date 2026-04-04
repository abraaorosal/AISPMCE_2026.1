import type { CSSProperties, ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  helper: string;
  accent: string;
  suffix?: ReactNode;
}

export function MetricCard({ label, value, helper, accent, suffix }: MetricCardProps) {
  return (
    <article
      className="metric-card"
      style={
        {
          '--metric-accent': accent,
        } as CSSProperties
      }
    >
      <div className="metric-card__header">
        <span>{label}</span>
        {suffix ? <small>{suffix}</small> : null}
      </div>

      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}
