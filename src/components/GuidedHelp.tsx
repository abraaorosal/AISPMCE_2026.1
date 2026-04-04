import { useEffect, useMemo, useState } from 'react';

interface GuidedHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    title: '1. Comece pelos filtros',
    description:
      'Os filtros ficam sempre visíveis. Comece pela aba "AIS" para destacar a área desejada no mapa.',
  },
  {
    title: '2. Busque um município',
    description:
      'Na aba "Município", digite o nome da cidade. O mapa centraliza automaticamente e mostra a AIS correspondente.',
  },
  {
    title: '3. Leia o mapa',
    description:
      'Passe o mouse sobre os pontos e áreas para ver nome e AIS. Clique para abrir mais detalhes com latitude e longitude.',
  },
  {
    title: '4. Use os indicadores',
    description:
      'Os cards no canto superior direito mostram rapidamente quantas AIS existem e quantos municípios estão mapeados.',
  },
];

export function GuidedHelp({ isOpen, onClose }: GuidedHelpProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = useMemo(() => steps[stepIndex], [stepIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-labelledby="guided-help-title">
      <div className="help-overlay__backdrop" onClick={onClose} />

      <section className="help-card">
        <div className="help-card__header">
          <div>
            <span className="caption">Modo de ajuda</span>
            <h2 id="guided-help-title">Tour guiado do mapa</h2>
          </div>

          <button className="ghost-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="help-card__progress" aria-label={`Etapa ${stepIndex + 1} de ${steps.length}`}>
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={index === stepIndex ? 'help-card__dot active' : 'help-card__dot'}
            />
          ))}
        </div>

        <div className="help-card__body">
          <strong>{step.title}</strong>
          <p>{step.description}</p>
        </div>

        <div className="help-card__actions">
          <button
            className="ghost-button"
            disabled={stepIndex === 0}
            type="button"
            onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
          >
            Voltar
          </button>

          {stepIndex === steps.length - 1 ? (
            <button className="primary-button" type="button" onClick={onClose}>
              Entendi
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))}
            >
              Próximo
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
