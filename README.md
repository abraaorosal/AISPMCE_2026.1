# Painel Territorial das AIS do Ceara

Aplicacao web moderna para visualizacao geografica do estado do Ceara com foco na divisao territorial por Areas Integradas de Seguranca.

## Stack

- React
- TypeScript
- Vite
- Leaflet

## Comandos

```bash
npm install
npm run prepare:fortaleza
npm run prepare:caucaia
npm run dev
npm run build
npm run preview
```

## Estrutura principal

- `public/data/`: arquivos reais usados em runtime via `fetch`
- `public/assets/branding/`: logos institucionais
- `src/components/`: interface e mapa
- `src/config/`: cores das AIS e configuracao do mapa
- `src/data/`: referencias de fontes e copias locais dos arquivos originais
- `src/hooks/`: carregamento dos dados e tema claro/escuro
- `src/pages/`: composicao da tela principal
- `src/services/`: leitura, normalizacao e cruzamento territorial
- `src/styles/`: estilos globais do dashboard
- `src/types/`: contratos TypeScript da aplicacao
- `src/utils/`: formatacao, geometria e normalizacao de nomes

## Observacoes sobre os dados

- O `geojson` contem os poligonos municipais do Ceara. As coordenadas exibidas no popup sao centroides calculados a partir dessas geometrias.
- O arquivo de AIS mistura municipios e bairros/distritos urbanos. Entradas sem correspondencia municipal unica sao tratadas como inconsistencias e listadas no painel lateral.
- Fortaleza agora possui divisao exata por bairros a partir da base oficial `bairros_2025.kmz` do portal Fortaleza Dados Abertos, convertida para `public/data/fortaleza-bairros.geojson`.
- Caucaia agora pode carregar divisao intramunicipal a partir da base oficial do IBGE de Setores Censitarios 2022, agregada em `public/data/caucaia-unidades-territoriais.geojson`.
- Os poligonos das AIS sao dissolvidos a partir das unidades territoriais validas.
- Alguns rotulos de Caucaia ainda podem permanecer como inconsistencias quando a propria base oficial nao separa exatamente os mesmos recortes do arquivo de AIS, especialmente nos agrupamentos rurais e no desdobramento leste/oeste da sede.
