import { useEffect, useState, type ReactNode, type TouchEvent } from 'react';

export type BottomSheetViewState = 'collapsed' | 'expanded' | 'full';

export interface BottomSheetTab {
  id: string;
  label: string;
}

interface BottomSheetProps {
  activeTab: string;
  children: ReactNode;
  tabs: BottomSheetTab[];
  topContent?: ReactNode;
  onTabChange: (tabId: string) => void;
}

const STATE_ORDER: BottomSheetViewState[] = ['collapsed', 'expanded', 'full'];
const SWIPE_THRESHOLD = 50;

function getStateOffset(sheetState: BottomSheetViewState) {
  switch (sheetState) {
    case 'expanded':
      return '65vh';
    case 'full':
      return 'calc(100dvh - var(--app-header-height))';
    default:
      return '120px';
  }
}

export function BottomSheet({
  activeTab,
  children,
  tabs,
  topContent,
  onTabChange,
}: BottomSheetProps) {
  const [sheetState, setSheetState] = useState<BottomSheetViewState>('collapsed');
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const offsetValue = getStateOffset(sheetState);
  const isExpanded = sheetState !== 'collapsed';

  useEffect(() => {
    document.documentElement.style.setProperty('--bottom-sheet-offset', offsetValue);
    window.dispatchEvent(new Event('resize'));
  }, [offsetValue]);

  useEffect(
    () => () => {
      document.documentElement.style.setProperty('--bottom-sheet-offset', '0px');
    },
    [],
  );

  const expandSheet = () => {
    setSheetState((currentState) => {
      const currentIndex = STATE_ORDER.indexOf(currentState);
      return STATE_ORDER[Math.min(currentIndex + 1, STATE_ORDER.length - 1)] ?? currentState;
    });
  };

  const collapseSheet = () => {
    setSheetState((currentState) => {
      const currentIndex = STATE_ORDER.indexOf(currentState);
      return STATE_ORDER[Math.max(currentIndex - 1, 0)] ?? currentState;
    });
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    setTouchStartY(event.changedTouches[0]?.clientY ?? null);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const endY = event.changedTouches[0]?.clientY;

    if (touchStartY === null || typeof endY !== 'number') {
      setTouchStartY(null);
      return;
    }

    const deltaY = touchStartY - endY;

    if (deltaY > SWIPE_THRESHOLD) {
      expandSheet();
    } else if (deltaY < -SWIPE_THRESHOLD) {
      collapseSheet();
    }

    setTouchStartY(null);
  };

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);

    if (sheetState === 'collapsed') {
      setSheetState('expanded');
    }
  };

  const handleGripClick = () => {
    if (sheetState === 'collapsed') {
      setSheetState('expanded');
      return;
    }

    if (sheetState === 'expanded') {
      setSheetState('full');
      return;
    }

    setSheetState('expanded');
  };

  return (
    <section
      className={[
        'bottom-sheet',
        sheetState === 'expanded' ? 'expanded' : '',
        sheetState === 'full' ? 'full' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
    >
      <button
        aria-label="Expandir ou recolher painel"
        aria-expanded={isExpanded}
        className="bottom-sheet__handle"
        type="button"
        onClick={handleGripClick}
      >
        <span className="bottom-sheet__handle-bar" aria-hidden="true" />
      </button>

      {topContent ? <div className="bottom-sheet__summary">{topContent}</div> : null}

      <div className="bottom-sheet__tabs" role="tablist" aria-label="Exploração mobile">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'bottom-sheet__tab active' : 'bottom-sheet__tab'}
            role="tab"
            type="button"
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bottom-sheet__content">{children}</div>
    </section>
  );
}
