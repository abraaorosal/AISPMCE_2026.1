export function LoadingState() {
  return (
    <div className="status-shell">
      <div className="status-card status-card--loading">
        <div className="spinner" />
        <div>
          <p className="eyebrow">Processando bases territoriais</p>
          <h1>Carregando o painel das AIS do Ceará</h1>
          <p>
            Normalizando nomes dos municípios, cruzando a divisão territorial e preparando o mapa
            interativo.
          </p>
        </div>
      </div>
    </div>
  );
}
