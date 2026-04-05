#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVE_DIR="$PROJECT_ROOT/.esbuild-dev"
HOST="127.0.0.1"
PORT="4173"
WATCH_PID=""
SERVER_PID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST="${2:-$HOST}"
      shift 2
      ;;
    --host=*)
      HOST="${1#*=}"
      shift
      ;;
    --port)
      PORT="${2:-$PORT}"
      shift 2
      ;;
    --port=*)
      PORT="${1#*=}"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

ESBUILD_BIN="$PROJECT_ROOT/node_modules/@esbuild/darwin-arm64/bin/esbuild"

if [[ ! -x "$ESBUILD_BIN" ]]; then
  echo "Binário do esbuild não encontrado em $ESBUILD_BIN"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 não está disponível no sistema."
  exit 1
fi

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$WATCH_PID" ]] && kill -0 "$WATCH_PID" >/dev/null 2>&1; then
    kill "$WATCH_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "Preparando arquivos de desenvolvimento..."
rm -rf "$SERVE_DIR"
mkdir -p "$SERVE_DIR/assets" "$SERVE_DIR/data"

if [[ -d "$PROJECT_ROOT/public/data" ]]; then
  cp -R "$PROJECT_ROOT/public/data/." "$SERVE_DIR/data/"
fi

if [[ -f "$PROJECT_ROOT/public/assets/branding/logo-pmce.png" ]]; then
  mkdir -p "$SERVE_DIR/assets/branding"
  cp "$PROJECT_ROOT/public/assets/branding/logo-pmce.png" "$SERVE_DIR/assets/branding/logo-pmce.png"
fi

if [[ -f "$PROJECT_ROOT/public/assets/branding/logo-cpraio.jpeg" ]]; then
  mkdir -p "$SERVE_DIR/assets/branding"
  cp "$PROJECT_ROOT/public/assets/branding/logo-cpraio.jpeg" "$SERVE_DIR/assets/branding/logo-cpraio.jpeg"
fi

cat > "$SERVE_DIR/index.html" <<'EOF'
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <meta
      name="description"
      content="Dashboard geográfico das Áreas Integradas de Segurança do Ceará."
    />
    <link rel="icon" type="image/png" href="./assets/branding/logo-pmce.png" />
    <link rel="apple-touch-icon" href="./assets/branding/logo-pmce.png" />
    <link rel="stylesheet" href="/assets/main.css" />
    <title>Painel Territorial das AIS do Ceará</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/main.js"></script>
  </body>
  </html>
EOF

BUILD_ARGS=(
  src/main.tsx
  --bundle
  --format=esm
  --platform=browser
  --target=es2020
  --jsx=automatic
  --tsconfig=tsconfig.json
  --outdir=.esbuild-dev/assets
  --entry-names=main
  '--asset-names=chunks/[name]-[hash]'
  --loader:.css=css
  --loader:.png=dataurl
  --loader:.jpg=dataurl
  --loader:.jpeg=dataurl
  --loader:.svg=file
  --loader:.webp=file
)

echo "Compilando a interface inicial. Isso pode levar alguns segundos na primeira execução..."
"$ESBUILD_BIN" "${BUILD_ARGS[@]}"

echo "Build inicial concluído. Iniciando modo de observação..."
"$ESBUILD_BIN" "${BUILD_ARGS[@]}" --watch=forever &
WATCH_PID=$!

(
  cd "$SERVE_DIR"
  exec python3 -m http.server "$PORT" --bind "$HOST"
) &
SERVER_PID=$!

echo "Servidor disponível em http://$HOST:$PORT"
wait "$SERVER_PID"
