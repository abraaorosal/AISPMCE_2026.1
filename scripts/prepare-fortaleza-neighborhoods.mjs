import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE_URL =
  'https://dados.fortaleza.ce.gov.br/dataset/a90409b9-4c2c-4ad0-bcc0-3e24a381c531/resource/08c58502-965e-4f28-bb6e-b08dab04b788/download/bairros_2025.kmz';
const OUTPUT_PATH = 'public/data/fortaleza-bairros.geojson';

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseCoordinates(rawCoordinates) {
  return rawCoordinates
    .trim()
    .split(/\s+/)
    .map((triple) => {
      const [longitude, latitude] = triple.split(',').map(Number);
      return [longitude, latitude];
    });
}

function parsePlacemarks(kml) {
  const folderMatch = kml.match(/<Folder>\s*<name>POLIGONAIS<\/name>([\s\S]*?)<\/Folder>/);

  if (!folderMatch) {
    throw new Error('A camada POLIGONAIS nao foi encontrada no KMZ oficial de Fortaleza.');
  }

  return [...folderMatch[1].matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)].map((match) => {
    const placemark = match[1];
    const id = placemark.match(/<SimpleData name="id">([\s\S]*?)<\/SimpleData>/)?.[1]?.trim();
    const name =
      placemark.match(/<SimpleData name="nome">([\s\S]*?)<\/SimpleData>/)?.[1]?.trim() ??
      placemark.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim();
    const legislation =
      placemark.match(/<SimpleData name="legislacao">([\s\S]*?)<\/SimpleData>/)?.[1]?.trim() ??
      '';
    const coordinates =
      placemark.match(/<coordinates>([\s\S]*?)<\/coordinates>/)?.[1]?.trim() ?? '';

    if (!id || !name || !coordinates) {
      throw new Error(`Placemark invalido encontrado no arquivo oficial de Fortaleza: ${name}`);
    }

    return {
      type: 'Feature',
      properties: {
        id,
        name: decodeXml(name),
        municipality: 'Fortaleza',
        legislation: decodeXml(legislation),
        source: 'Fortaleza Dados Abertos - bairros_2025.kmz',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [parseCoordinates(coordinates)],
      },
    };
  });
}

async function main() {
  const temporaryKmzPath = join(tmpdir(), 'fortaleza-bairros-oficial.kmz');
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Falha ao baixar a base oficial de Fortaleza (${response.status}).`);
  }

  await writeFile(temporaryKmzPath, Buffer.from(await response.arrayBuffer()));

  const kml = execFileSync('unzip', ['-p', temporaryKmzPath, 'doc.kml'], {
    encoding: 'utf8',
    maxBuffer: 60 * 1024 * 1024,
  });

  const featureCollection = {
    type: 'FeatureCollection',
    features: parsePlacemarks(kml),
  };

  await mkdir('public/data', { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(featureCollection, null, 2)}\n`, 'utf8');

  console.log(`Arquivo gerado em ${OUTPUT_PATH} com ${featureCollection.features.length} bairros.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
