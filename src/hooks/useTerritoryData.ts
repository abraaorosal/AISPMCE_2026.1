import { useEffect, useState } from 'react';

import { loadTerritoryDataset } from '@/services/territoryService';
import type { TerritoryDataset } from '@/types';

interface TerritoryDataState {
  data: TerritoryDataset | null;
  isLoading: boolean;
  error: string | null;
}

export function useTerritoryData() {
  const [state, setState] = useState<TerritoryDataState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    loadTerritoryDataset()
      .then((data) => {
        if (!active) {
          return;
        }

        setState({
          data,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState({
          data: null,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Falha inesperada ao processar os arquivos territoriais.',
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
