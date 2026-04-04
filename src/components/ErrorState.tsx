interface ErrorStateProps {
  message: string | null;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="status-shell">
      <div className="status-card">
        <p className="eyebrow">Falha ao montar a visualização</p>
        <h1>Não foi possível carregar os dados territoriais</h1>
        <p>{message ?? 'Verifique os arquivos locais e tente novamente.'}</p>
        <button className="primary-button" type="button" onClick={() => window.location.reload()}>
          Recarregar aplicação
        </button>
      </div>
    </div>
  );
}
