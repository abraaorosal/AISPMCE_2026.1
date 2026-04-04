import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import polygonClipping from 'polygon-clipping';
import * as shapefile from 'shapefile';

const SOURCE_URL =
  'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/setores/shp/UF/CE_setores_CD2022.zip';
const OUTPUT_PATH = 'public/data/caucaia-unidades-territoriais.geojson';
const TARGET_MUNICIPALITY = 'Caucaia';
const TARGET_AIS_IDS = new Set(['AIS12', 'AIS26']);
const FIELD_PRIORITY = [
  { field: 'NM_BAIRRO', kind: 'bairro' },
  { field: 'NM_FCU', kind: 'comunidade urbana' },
  { field: 'NM_AGLOM', kind: 'aglomerado' },
  { field: 'NM_NU', kind: 'nucleo urbano' },
  { field: 'NM_SUBDIST', kind: 'subdistrito' },
  { field: 'NM_DIST', kind: 'distrito' },
];
const FIELD_VALUE_ALIASES = {
  NM_BAIRRO: {
    genipabu: 'Genipabú',
    'parque guadalajara': 'Guadalajara',
    'parque potira': 'Potira',
    'patricia gomes': 'Patrícia Gomes',
    'tabapua brasilia': 'Tabapuá Brasília',
  },
  NM_FCU: {
    catuana: 'Catuana',
    primavera: 'Primavera',
    'parque das nacoes': 'Parque das Nações',
    'tabapua brasilia': 'Tabapuá Brasília',
  },
  NM_AGLOM: {
    'aldeia indigena japuara': 'Japuara',
    'aldeia indigena japuara 1': 'Japuara',
    'aldeia indigena japuara 3': 'Japuara',
    'aldeia indigena japuara 4': 'Japuara',
    'barra do cauipe': 'Cauípe',
    camara: 'Camará',
    'coite pedreira': 'Coité (Caucaia)',
    'comunidade quilombola porteiras': 'Porteiras',
    'comunidade quilombola porteiras 1': 'Porteiras',
    'comunidade quilombola porteiras 2': 'Porteiras',
    'corrego do alexandre': 'Córrego do Alexandre',
    matoes: 'Matões',
    'pau branco': 'Pau Branco',
    pitombeiras: 'Pitombeira',
  },
  NM_DIST: {
    'bom principio': 'Distrito Bom Princípio',
    catuana: 'Distrito Catuana',
    guararu: 'Distrito Guararu',
    mirambe: 'Distrito Mirambé',
    'sitios novos': 'Distrito Sítios Novos',
    tucunduba: 'Distrito Tucunduba',
  },
};

function normalizeName(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalizeName(value).replace(/\s+/g, '-');
}

function geometryToMultiPolygonCoordinates(geometry) {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function dissolveGeometries(geometries) {
  if (!geometries.length) {
    return null;
  }

  const preparedGeometries = geometries.map((geometry) => geometryToMultiPolygonCoordinates(geometry));
  let dissolvedGeometry = preparedGeometries[0];

  for (const geometry of preparedGeometries.slice(1)) {
    dissolvedGeometry = polygonClipping.union(dissolvedGeometry, geometry);
  }

  if (!dissolvedGeometry?.length) {
    return null;
  }

  return dissolvedGeometry.length === 1
    ? {
        type: 'Polygon',
        coordinates: dissolvedGeometry[0],
      }
    : {
        type: 'MultiPolygon',
        coordinates: dissolvedGeometry,
      };
}

function resolveFieldEntry(field, rawValue, targetEntriesByNormalizedName) {
  const normalizedValue = normalizeName(rawValue);

  if (targetEntriesByNormalizedName.has(normalizedValue)) {
    return targetEntriesByNormalizedName.get(normalizedValue);
  }

  return FIELD_VALUE_ALIASES[field]?.[normalizedValue] ?? null;
}

async function loadTargetEntries() {
  const aisSource = JSON.parse(await readFile('public/data/ais-ceara.json', 'utf8'));

  return aisSource.area_integrada_de_seguranca
    .filter((area) => TARGET_AIS_IDS.has(area.ais))
    .flatMap((area) => area.municipios_ou_bairros);
}

async function main() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'caucaia-setores-'));
  const temporaryZipPath = join(temporaryDirectory, 'CE_setores_CD2022.zip');
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Falha ao baixar a base oficial do IBGE para Caucaia (${response.status}).`);
  }

  await writeFile(temporaryZipPath, Buffer.from(await response.arrayBuffer()));
  execFileSync('unzip', ['-oq', temporaryZipPath, '-d', temporaryDirectory], {
    stdio: 'ignore',
  });

  const targetEntries = await loadTargetEntries();
  const targetEntriesByNormalizedName = new Map(
    targetEntries.map((entry) => [normalizeName(entry), entry]),
  );
  const groupedUnits = new Map();
  const unresolvedSectorSamples = [];

  const source = await shapefile.open(
    join(temporaryDirectory, 'CE_setores_CD2022.shp'),
    join(temporaryDirectory, 'CE_setores_CD2022.dbf'),
    { encoding: 'utf-8' },
  );

  while (true) {
    const { done, value } = await source.read();
    if (done) {
      break;
    }

    if (value.properties.NM_MUN !== TARGET_MUNICIPALITY) {
      continue;
    }

    let matchedEntry = null;
    let matchedKind = null;
    let matchedSourceValue = null;

    for (const candidate of FIELD_PRIORITY) {
      const rawValue = value.properties[candidate.field];

      if (!rawValue) {
        continue;
      }

      const resolvedEntry = resolveFieldEntry(
        candidate.field,
        rawValue,
        targetEntriesByNormalizedName,
      );

      if (!resolvedEntry) {
        continue;
      }

      matchedEntry = resolvedEntry;
      matchedKind = candidate.kind;
      matchedSourceValue = rawValue;
      break;
    }

    if (!matchedEntry) {
      unresolvedSectorSamples.push({
        sector: value.properties.CD_SETOR,
        district: value.properties.NM_DIST ?? '',
        neighborhood: value.properties.NM_BAIRRO ?? '',
        urbanCore: value.properties.NM_NU ?? '',
        agglomeration: value.properties.NM_AGLOM ?? '',
      });
      continue;
    }

    const currentGroup = groupedUnits.get(matchedEntry) ?? {
      kind: matchedKind,
      sourceValue: matchedSourceValue,
      geometries: [],
    };

    currentGroup.geometries.push(value.geometry);
    groupedUnits.set(matchedEntry, currentGroup);
  }

  const features = [...groupedUnits.entries()]
    .map(([entryName, group]) => {
      const geometry = dissolveGeometries(group.geometries);

      if (!geometry) {
        return null;
      }

      return {
        type: 'Feature',
        properties: {
          id: `caucaia:${slugify(entryName)}`,
          name: entryName,
          municipality: TARGET_MUNICIPALITY,
          kind: group.kind,
          source:
            'IBGE - Malha de Setores Censitarios 2022 agregada por unidade territorial de Caucaia',
        },
        geometry,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.properties.name.localeCompare(right.properties.name, 'pt-BR'));

  const featureCollection = {
    type: 'FeatureCollection',
    features,
  };

  await mkdir('public/data', { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(featureCollection, null, 2)}\n`, 'utf8');

  const coveredEntries = new Set(features.map((feature) => feature.properties.name));
  const unresolvedEntries = targetEntries.filter((entry) => !coveredEntries.has(entry));

  console.log(`Arquivo gerado em ${OUTPUT_PATH} com ${features.length} unidades para Caucaia.`);
  console.log(`Entradas cobertas diretamente: ${coveredEntries.size}/${targetEntries.length}.`);

  if (unresolvedEntries.length) {
    console.log('Entradas ainda sem correspondencia exata na base oficial do IBGE:');
    unresolvedEntries.forEach((entry) => console.log(` - ${entry}`));
  }

  if (unresolvedSectorSamples.length) {
    console.log(`Setores de Caucaia ainda sem unidade resolvida: ${unresolvedSectorSamples.length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
