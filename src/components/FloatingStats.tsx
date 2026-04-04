import type { ReactNode } from 'react';

import type { TerritoryStatistics } from '@/types';

interface FloatingStatsProps {
  statistics: TerritoryStatistics;
}

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'blue' | 'green';
}

function StatCard({ icon, label, value, tone }: StatCardProps) {
  return (
    <article className={`floating-stat floating-stat--${tone}`}>
      <span className="floating-stat__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function MapIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M3 6.5L9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CityIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M4 20V9l6-3v14M10 20h10V4l-5 2-5-2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M7 11h.01M7 14h.01M14 9h.01M17 9h.01M14 12h.01M17 12h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

export function FloatingStats({ statistics }: FloatingStatsProps) {
  return (
    <div className="floating-stats" aria-label="Indicadores do mapa">
      <StatCard icon={<MapIcon />} label="AIS cadastradas" tone="blue" value={String(statistics.totalAis)} />
      <StatCard
        icon={<CityIcon />}
        label="Municípios mapeados"
        tone="green"
        value={`${statistics.mappedMunicipalities}/${statistics.totalMunicipalities}`}
      />
    </div>
  );
}
