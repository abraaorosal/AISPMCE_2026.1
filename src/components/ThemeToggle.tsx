import type { ThemeMode } from '@/types';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button className="theme-toggle" type="button" onClick={onToggle}>
      <span className="theme-toggle__label">Tema</span>
      <strong>{theme === 'light' ? 'Claro' : 'Escuro'}</strong>
    </button>
  );
}
