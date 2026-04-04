import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');
const serveDir = path.join(projectRoot, '.esbuild-dev');
const assetsDir = path.join(serveDir, 'assets');
const publicDir = path.join(projectRoot, 'public');
const cliArgs = process.argv.slice(2);

function getCliValue(flag) {
  const inline = cliArgs.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) {
    return inline.split('=')[1];
  }

  const index = cliArgs.findIndex((arg) => arg === flag);
  if (index >= 0) {
    return cliArgs[index + 1];
  }

  return undefined;
}

const port = Number(getCliValue('--port') || process.env.PORT || '4173');
const host = getCliValue('--host') || process.env.HOST || '127.0.0.1';
const esbuildBinary = path.join(
  projectRoot,
  'node_modules',
  '@esbuild',
  `${process.platform}-${process.arch}`,
  'bin',
  'esbuild',
);

const htmlTemplate = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Dashboard geográfico das Áreas Integradas de Segurança do Ceará."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/assets/main.css" />
    <title>Painel Territorial das AIS do Ceará</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/main.js"></script>
  </body>
</html>
`;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

async function prepareServeDir() {
  await rm(serveDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });
  await writeFile(path.join(serveDir, 'index.html'), htmlTemplate, 'utf-8');
}

function runEsbuild(args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(esbuildBinary, args, {
      cwd: projectRoot,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: false,
    });

    child.on('error', (error) => {
      reject(new Error(`${label} falhou ao iniciar: ${error.message}`));
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(child);
        return;
      }

      reject(new Error(`${label} falhou com código ${code ?? 1}.`));
    });
  });
}

function getBuildArgs({ watch }) {
  const args = [
    'src/main.tsx',
    '--bundle',
    '--format=esm',
    '--platform=browser',
    '--target=es2020',
    '--jsx=automatic',
    '--tsconfig=tsconfig.json',
    '--outdir=.esbuild-dev/assets',
    '--entry-names=main',
    '--asset-names=chunks/[name]-[hash]',
    '--loader:.css=css',
    '--loader:.png=dataurl',
    '--loader:.jpg=dataurl',
    '--loader:.jpeg=dataurl',
    '--loader:.svg=file',
    '--loader:.webp=file',
  ];

  if (watch) {
    args.push('--watch=forever');
  }

  return args;
}

async function resolveRequestFile(requestPath) {
  const cleanPath = requestPath.split('?')[0].split('#')[0];
  const normalizedPath = cleanPath === '/' ? '/index.html' : cleanPath;
  const isHtmlRequest =
    normalizedPath === '/index.html' ||
    normalizedPath.endsWith('.html') ||
    !path.extname(normalizedPath);

  const candidatePaths = [];

  if (normalizedPath.startsWith('/assets/')) {
    candidatePaths.push(path.join(serveDir, normalizedPath.slice(1)));
  }

  candidatePaths.push(path.join(publicDir, normalizedPath.slice(1)));

  if (isHtmlRequest) {
    candidatePaths.unshift(path.join(serveDir, 'index.html'));
  }

  for (const candidatePath of candidatePaths) {
    try {
      const fileStats = await stat(candidatePath);
      if (fileStats.isFile()) {
        return candidatePath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const filePath = await resolveRequestFile(request.url || '/');
      if (!filePath) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Arquivo não encontrado.');
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      const contentType = contentTypes[extension] || 'application/octet-stream';
      const file = await readFile(filePath);

      response.writeHead(200, {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': contentType,
        Pragma: 'no-cache',
      });
      response.end(file);
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(`Falha ao servir o arquivo.\n${error instanceof Error ? error.message : 'Erro desconhecido.'}`);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  console.log(`Servidor disponível em http://${host}:${port}`);
  return server;
}

async function start() {
  console.log('Preparando arquivos de desenvolvimento...');
  await prepareServeDir();
  console.log('Compilando a interface inicial. Isso pode levar alguns segundos na primeira execução...');
  await runEsbuild(getBuildArgs({ watch: false }), 'Build inicial');
  console.log('Build inicial concluído. Iniciando modo de observação...');
  const watchProcess = spawn(esbuildBinary, getBuildArgs({ watch: true }), {
    cwd: projectRoot,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: false,
  });
  const server = await startServer();

  watchProcess.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`Watcher do esbuild encerrou com código ${code}.`);
    }
  });

  process.on('SIGINT', () => {
    watchProcess.kill('SIGINT');
    server.close(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    watchProcess.kill('SIGTERM');
    server.close(() => process.exit(0));
  });
}

start().catch((error) => {
  console.error('Falha ao iniciar o servidor alternativo.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
