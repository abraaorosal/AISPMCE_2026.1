import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');
const sourcePath = path.join(projectRoot, 'municipios_base_raio_coordenadas.json');
const targetDir = path.join(projectRoot, 'public', 'data');
const targetPath = path.join(targetDir, 'municipios-base-raio-coordenadas.json');

async function syncRaioBases() {
  const sourceContent = await readFile(sourcePath, 'utf-8');
  const parsed = JSON.parse(sourceContent);

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');

  console.log(`Base sincronizada: ${path.relative(projectRoot, targetPath)}`);
}

syncRaioBases().catch((error) => {
  console.error('Falha ao sincronizar a base RAIO.');
  console.error(error);
  process.exitCode = 1;
});
