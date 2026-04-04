import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');
const sourcePath = path.join(projectRoot, 'sedesPM.json');
const targetDir = path.join(projectRoot, 'public', 'data');
const targetPath = path.join(targetDir, 'sedes-pm.json');

async function syncPmUnits() {
  const sourceContent = await readFile(sourcePath, 'utf-8');
  const parsed = JSON.parse(sourceContent);

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');

  console.log(`Base sincronizada: ${path.relative(projectRoot, targetPath)}`);
}

syncPmUnits().catch((error) => {
  console.error('Falha ao sincronizar a base de unidades da PM.');
  console.error(error);
  process.exitCode = 1;
});
