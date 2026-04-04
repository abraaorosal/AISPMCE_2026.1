import { getAisColor, UNASSIGNED_MUNICIPALITY_COLOR } from '@/config/aisColors';
import { getPMUnitCategoryColor, getPMUnitCategoryLabel } from '@/config/pmUnits';
import { TERRITORIAL_NAME_ALIASES } from '@/config/territorial';
import { loadRawSources } from '@/data/sources';
import {
  computeBounds,
  computeCentroid,
  dissolveGeometries,
  mergeBounds,
} from '@/utils/geometry';
import {
  compactNormalizedName,
  normalizeName,
  normalizeTerritorialName,
} from '@/utils/normalize';
import type {
  AISArea,
  AISSourceFile,
  AreaScope,
  MappingInconsistency,
  MapBounds,
  MappedMunicipality,
  MunicipalityGeoCollection,
  NeighborhoodGeoCollection,
  PMUnit,
  PMUnitIssue,
  PMUnitSourceFile,
  RaioBaseSourceFile,
  TerritorialUnit,
  TerritoryDataset,
} from '@/types';

const URBAN_DETAIL_MIN_ENTRIES = 6;
const MUNICIPAL_MATCH_RATIO_LIMIT = 0.45;
const SUBMUNICIPAL_MATCH_RATIO_LIMIT = 0.6;

interface MunicipalityMatch {
  entry: string;
  normalizedEntry: string;
  municipalityName: string;
}

interface SubmunicipalCatalogItem {
  id: string;
  municipalityName: string;
  municipalityNormalizedName: string;
  name: string;
  normalizedName: string;
  compactName: string;
  kind?: string;
  geometry: TerritorialUnit['geometry'];
  bounds: MapBounds;
  latitude: number;
  longitude: number;
  source: string;
}

interface SubmunicipalMatch {
  entry: string;
  normalizedEntry: string;
  unit: SubmunicipalCatalogItem;
}

interface AreaCandidate {
  id: string;
  entries: string[];
  normalizedEntries: string[];
  matchedMunicipalityEntries: MunicipalityMatch[];
  matchedSubmunicipalEntries: SubmunicipalMatch[];
  unmatchedEntries: Array<{
    entry: string;
    normalizedEntry: string;
  }>;
  exactMatchCount: number;
  totalEntries: number;
  scope: AreaScope;
}

interface AssignmentCandidate {
  aisId: string;
  entry: string;
  normalizedEntry: string;
  matchRatio: number;
}

interface SubmunicipalAssignmentCandidate extends AssignmentCandidate {
  unit: SubmunicipalCatalogItem;
}

interface PMUnitBase {
  id: string;
  name: string;
  shortName: string;
  categoryKey: string;
  categoryLabel: string;
  categoryColor: string;
  municipalityId: string | null;
  municipalityName: string | null;
  municipalityNormalizedName: string | null;
  aisId: string | null;
  aisColor: string;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  email: string | null;
  strength: number | null;
  locationSource: PMUnit['locationSource'];
  locationNote: string;
}

function buildNeighborhoodCatalog(sources: Array<NeighborhoodGeoCollection | null>) {
  return sources.flatMap((source) => {
    if (!source) {
      return [];
    }

    return source.features.map<SubmunicipalCatalogItem>((feature) => {
      const bounds = computeBounds(feature.geometry);
      const centroid = computeCentroid(feature.geometry);

      return {
        id: feature.properties.id,
        municipalityName: feature.properties.municipality,
        municipalityNormalizedName: normalizeName(feature.properties.municipality),
        name: feature.properties.name,
        normalizedName: normalizeTerritorialName(feature.properties.name),
        compactName: compactNormalizedName(feature.properties.name),
        kind: feature.properties.kind,
        geometry: feature.geometry,
        bounds,
        latitude: centroid.latitude,
        longitude: centroid.longitude,
        source: feature.properties.source,
      };
    });
  });
}

function resolveSubmunicipalMatch(
  entry: string,
  catalog: SubmunicipalCatalogItem[],
): SubmunicipalCatalogItem | null {
  if (!catalog.length) {
    return null;
  }

  const normalizedEntry = normalizeTerritorialName(entry);
  const aliasedEntry = TERRITORIAL_NAME_ALIASES[
    normalizedEntry as keyof typeof TERRITORIAL_NAME_ALIASES
  ]
    ? normalizeTerritorialName(
        TERRITORIAL_NAME_ALIASES[
          normalizedEntry as keyof typeof TERRITORIAL_NAME_ALIASES
        ],
      )
    : normalizedEntry;
  const compactEntry = aliasedEntry.replace(/\s+/g, '');

  const exactMatches = catalog.filter((item) => item.normalizedName === aliasedEntry);
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const compactMatches = catalog.filter((item) => item.compactName === compactEntry);
  if (compactMatches.length === 1) {
    return compactMatches[0];
  }

  const fuzzyMatches = catalog.filter(
    (item) =>
      item.normalizedName.includes(aliasedEntry) ||
      aliasedEntry.includes(item.normalizedName) ||
      item.compactName.includes(compactEntry) ||
      compactEntry.includes(item.compactName),
  );

  return fuzzyMatches.length === 1 ? fuzzyMatches[0] : null;
}

function resolveAssignmentWinner<T extends AssignmentCandidate>(
  candidates: T[],
  discriminator: (candidate: T) => string,
) {
  const sortedCandidates = [...candidates].sort((left, right) => {
    if (right.matchRatio !== left.matchRatio) {
      return right.matchRatio - left.matchRatio;
    }

    return discriminator(left).localeCompare(discriminator(right), 'pt-BR');
  });

  const [winner, ...duplicates] = sortedCandidates;

  return {
    winner,
    duplicates,
  };
}

function resolvePMUnits(
  pmUnitsSource: PMUnitSourceFile,
  municipalities: MappedMunicipality[],
) {
  const municipalitiesByNormalizedName = new Map(
    municipalities.map((municipality) => [municipality.normalizedName, municipality]),
  );
  const resolvedUnits: PMUnitBase[] = [];
  const issues: PMUnitIssue[] = [];

  Object.entries(pmUnitsSource).forEach(([categoryKey, entries]) => {
    entries.forEach((entry) => {
      const municipalityNormalizedName = entry.municipio_sede
        ? normalizeName(entry.municipio_sede)
        : null;
      const municipality = municipalityNormalizedName
        ? municipalitiesByNormalizedName.get(municipalityNormalizedName) ?? null
        : null;
      const hasExactCoordinates =
        typeof entry.lat === 'number' && Number.isFinite(entry.lat) &&
        typeof entry.lng === 'number' && Number.isFinite(entry.lng);

      if (!hasExactCoordinates && !entry.municipio_sede) {
        issues.push({
          id: entry.id,
          name: entry.nome,
          shortName: entry.sigla ?? entry.nome,
          categoryLabel: getPMUnitCategoryLabel(categoryKey),
          municipalityName: null,
          aisId: entry.ais,
          reason: 'missing_municipality_reference',
          detail: 'Unidade sem coordenadas e sem municipio de sede para posicionamento aproximado.',
        });
        return;
      }

      if (!hasExactCoordinates && municipalityNormalizedName && !municipality) {
        issues.push({
          id: entry.id,
          name: entry.nome,
          shortName: entry.sigla ?? entry.nome,
          categoryLabel: getPMUnitCategoryLabel(categoryKey),
          municipalityName: entry.municipio_sede,
          aisId: entry.ais,
          reason: 'missing_municipality_match',
          detail:
            'Municipio de sede nao encontrado na malha municipal carregada; unidade nao pode ser posicionada.',
        });
        return;
      }

      const latitude = hasExactCoordinates ? Number(entry.lat) : municipality!.latitude;
      const longitude = hasExactCoordinates ? Number(entry.lng) : municipality!.longitude;

      resolvedUnits.push({
        id: entry.id,
        name: entry.nome,
        shortName: entry.sigla?.trim() || entry.nome,
        categoryKey,
        categoryLabel: getPMUnitCategoryLabel(categoryKey),
        categoryColor: getPMUnitCategoryColor(categoryKey),
        municipalityId: municipality?.id ?? null,
        municipalityName: entry.municipio_sede ?? municipality?.name ?? null,
        municipalityNormalizedName,
        aisId: entry.ais ?? municipality?.aisId ?? null,
        aisColor:
          entry.ais ?? municipality?.aisId
            ? getAisColor(entry.ais ?? municipality?.aisId ?? '')
            : UNASSIGNED_MUNICIPALITY_COLOR,
        latitude,
        longitude,
        address: entry.endereco,
        phone: entry.telefone,
        email: entry.email,
        strength: null,
        locationSource: hasExactCoordinates ? 'exact' : 'municipality_centroid',
        locationNote: hasExactCoordinates
          ? 'Posicao exata carregada do arquivo da unidade.'
          : `Posicao aproximada pela sede municipal de ${municipality?.name ?? entry.municipio_sede}.`,
      });
    });
  });

  return {
    units: resolvedUnits,
    issues,
  };
}

function resolveRaioBases(
  raioBasesSource: RaioBaseSourceFile,
  municipalities: MappedMunicipality[],
) {
  const municipalitiesById = new Map(
    municipalities.flatMap((municipality) => [
      [municipality.id, municipality] as const,
      [municipality.code, municipality] as const,
    ]),
  );
  const municipalitiesByNormalizedName = new Map(
    municipalities.map((municipality) => [municipality.normalizedName, municipality]),
  );
  const resolvedUnits: PMUnitBase[] = [];
  const issues: PMUnitIssue[] = [];

  raioBasesSource.forEach((entry, index) => {
    const municipalityByCode =
      (entry.id ? municipalitiesById.get(String(entry.id)) : null) ??
      (entry.codarea ? municipalitiesById.get(String(entry.codarea)) : null) ??
      null;
    const municipalityByName = entry.municipio
      ? municipalitiesByNormalizedName.get(normalizeName(entry.municipio)) ?? null
      : null;
    const municipality = municipalityByCode ?? municipalityByName;
    const hasExactCoordinates =
      typeof entry.latitude === 'number' &&
      Number.isFinite(entry.latitude) &&
      typeof entry.longitude === 'number' &&
      Number.isFinite(entry.longitude);

    if (!municipality && !hasExactCoordinates) {
      issues.push({
        id: `base-raio:${entry.id ?? index}`,
        name: `Base RAIO de ${entry.municipio ?? 'Município não informado'}`,
        shortName: entry.municipio ?? 'Base RAIO',
        categoryLabel: getPMUnitCategoryLabel('bases_raio'),
        municipalityName: entry.municipio ?? null,
        aisId: null,
        reason: 'missing_municipality_match',
        detail:
          'Base RAIO sem correspondência com a malha municipal e sem coordenadas válidas para posicionamento.',
      });
      return;
    }

    const municipalityName = municipality?.name ?? entry.municipio ?? 'Município não informado';
    const municipalityNormalizedName = municipality?.normalizedName ?? normalizeName(municipalityName);
    const latitude = hasExactCoordinates ? Number(entry.latitude) : municipality!.latitude;
    const longitude = hasExactCoordinates ? Number(entry.longitude) : municipality!.longitude;
    const shortName = municipalityName;

    resolvedUnits.push({
      id: `base-raio:${municipality?.id ?? entry.id ?? index}`,
      name: `Base RAIO de ${municipalityName}`,
      shortName,
      categoryKey: 'bases_raio',
      categoryLabel: getPMUnitCategoryLabel('bases_raio'),
      categoryColor: getPMUnitCategoryColor('bases_raio'),
      municipalityId: municipality?.id ?? null,
      municipalityName,
      municipalityNormalizedName,
      aisId: municipality?.aisId ?? null,
      aisColor: municipality?.aisId
        ? getAisColor(municipality.aisId)
        : UNASSIGNED_MUNICIPALITY_COLOR,
      latitude,
      longitude,
      address: null,
      phone: null,
      email: null,
      strength:
        typeof entry.efetivo === 'number' && Number.isFinite(entry.efetivo)
          ? entry.efetivo
          : null,
      locationSource: hasExactCoordinates ? 'exact' : 'municipality_centroid',
      locationNote: hasExactCoordinates
        ? `Posicao da base RAIO informada diretamente para ${municipalityName}.`
        : `Posicao aproximada pela sede municipal de ${municipalityName}.`,
    });
  });

  return {
    units: resolvedUnits,
    issues,
  };
}

function distributePMUnits(resolvedUnits: PMUnitBase[]) {
  const categoryOrder: Record<string, number> = {
    batalhoes: 0,
    bases_raio: 1,
    unidades_especializadas: 2,
    comandos: 3,
  };
  const categoryBaseAngles: Record<string, number> = {
    batalhoes: -Math.PI / 3,
    bases_raio: Math.PI / 3,
    unidades_especializadas: Math.PI,
    comandos: 0,
  };
  const groups = new Map<string, PMUnitBase[]>();
  resolvedUnits.forEach((unit) => {
    const key = `${unit.latitude.toFixed(5)}:${unit.longitude.toFixed(5)}`;
    const items = groups.get(key) ?? [];
    items.push(unit);
    groups.set(key, items);
  });

  const pmUnits: PMUnit[] = [];
  groups.forEach((unitsAtPoint) => {
    if (unitsAtPoint.length === 1) {
      pmUnits.push(unitsAtPoint[0]);
      return;
    }

    const unitsByCategory = new Map<string, PMUnitBase[]>();
    [...unitsAtPoint]
      .sort((left, right) => {
        const leftOrder = categoryOrder[left.categoryKey] ?? 99;
        const rightOrder = categoryOrder[right.categoryKey] ?? 99;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return left.shortName.localeCompare(right.shortName, 'pt-BR');
      })
      .forEach((unit) => {
        const items = unitsByCategory.get(unit.categoryKey) ?? [];
        items.push(unit);
        unitsByCategory.set(unit.categoryKey, items);
      });

    [...unitsByCategory.entries()].forEach(([categoryKey, categoryUnits]) => {
      const baseAngle = categoryBaseAngles[categoryKey] ?? 0;
      const baseRadius = 0.012 + (categoryOrder[categoryKey] ?? 4) * 0.0028;

      categoryUnits.forEach((unit, index) => {
        const offset = categoryUnits.length === 1 ? 0 : (index - (categoryUnits.length - 1) / 2) * 0.42;
        const angle = baseAngle + offset;
        const radius = baseRadius + Math.floor(index / 2) * 0.0012;
        const longitudeFactor = Math.max(Math.cos((unit.latitude * Math.PI) / 180), 0.32);

        pmUnits.push({
          ...unit,
          latitude: unit.latitude + Math.sin(angle) * radius,
          longitude: unit.longitude + (Math.cos(angle) * radius) / longitudeFactor,
          locationNote:
            unit.locationSource === 'exact'
              ? `${unit.locationNote} Marcador deslocado levemente apenas para evitar sobreposicao visual.`
              : `${unit.locationNote} Marcador distribuido no mapa para evitar sobreposicao com outras unidades na mesma sede.`,
        });
      });
    });
  });

  const pmUnitsById = Object.fromEntries(pmUnits.map((unit) => [unit.id, unit]));

  return {
    pmUnits,
    pmUnitsById,
  };
}

function buildTerritoryDataset(
  aisSource: AISSourceFile,
  municipalitiesSource: MunicipalityGeoCollection,
  fortalezaNeighborhoodsSource: NeighborhoodGeoCollection | null,
  caucaiaTerritorialUnitsSource: NeighborhoodGeoCollection | null,
  pmUnitsSource: PMUnitSourceFile,
  raioBasesSource: RaioBaseSourceFile,
): TerritoryDataset {
  const municipalityIndex = new Map(
    municipalitiesSource.features.map((feature) => [
      normalizeTerritorialName(feature.properties.name),
      feature,
    ]),
  );
  const municipalityByNormalizedName = new Map(
    municipalitiesSource.features.map((feature) => [
      normalizeName(feature.properties.name),
      feature,
    ]),
  );
  const neighborhoodCatalog = buildNeighborhoodCatalog([
    fortalezaNeighborhoodsSource,
    caucaiaTerritorialUnitsSource,
  ]);

  const areaCandidates: AreaCandidate[] = aisSource.area_integrada_de_seguranca.map((area) => {
    const normalizedEntries = area.municipios_ou_bairros.map((entry) =>
      normalizeTerritorialName(entry),
    );
    const matchedMunicipalityEntries = area.municipios_ou_bairros.flatMap((entry, index) => {
      const normalizedEntry = normalizedEntries[index];
      const municipality = municipalityIndex.get(normalizedEntry);

      if (!municipality) {
        return [];
      }

      return [
        {
          entry,
          normalizedEntry,
          municipalityName: municipality.properties.name,
        },
      ];
    });
    const matchedSubmunicipalEntries = area.municipios_ou_bairros.flatMap((entry, index) => {
      const normalizedEntry = normalizedEntries[index];
      const unit = resolveSubmunicipalMatch(entry, neighborhoodCatalog);

      if (!unit) {
        return [];
      }

      return [
        {
          entry,
          normalizedEntry,
          unit,
        },
      ];
    });

    const resolvedEntrySet = new Set([
      ...matchedMunicipalityEntries.map((item) => item.entry),
      ...matchedSubmunicipalEntries.map((item) => item.entry),
    ]);

    const unmatchedEntries = area.municipios_ou_bairros.flatMap((entry, index) => {
      if (resolvedEntrySet.has(entry)) {
        return [];
      }

      return [
        {
          entry,
          normalizedEntry: normalizedEntries[index],
        },
      ];
    });

    const municipalMatchRatio = matchedMunicipalityEntries.length / Math.max(area.municipios_ou_bairros.length, 1);
    const submunicipalMatchRatio =
      matchedSubmunicipalEntries.length / Math.max(area.municipios_ou_bairros.length, 1);
    const scope =
      matchedSubmunicipalEntries.length > 0 &&
      submunicipalMatchRatio >= SUBMUNICIPAL_MATCH_RATIO_LIMIT
        ? 'submunicipal'
        : area.municipios_ou_bairros.length >= URBAN_DETAIL_MIN_ENTRIES &&
            municipalMatchRatio < MUNICIPAL_MATCH_RATIO_LIMIT
          ? 'urban-detail'
          : 'municipal';

    return {
      id: area.ais,
      entries: area.municipios_ou_bairros,
      normalizedEntries,
      matchedMunicipalityEntries,
      matchedSubmunicipalEntries,
      unmatchedEntries,
      exactMatchCount:
        scope === 'submunicipal'
          ? matchedSubmunicipalEntries.length
          : matchedMunicipalityEntries.length,
      totalEntries: area.municipios_ou_bairros.length,
      scope,
    };
  });

  const municipalAssignmentCandidates = new Map<string, AssignmentCandidate[]>();
  const submunicipalAssignmentCandidates = new Map<string, SubmunicipalAssignmentCandidate[]>();
  const inconsistencies: MappingInconsistency[] = [];

  areaCandidates.forEach((area) => {
    if (area.scope === 'urban-detail') {
      area.entries.forEach((entry, index) => {
        inconsistencies.push({
          aisId: area.id,
          entry,
          normalizedEntry: area.normalizedEntries[index],
          reason: 'urban_detail_entry',
          detail:
            'Entrada classificada como bairro ou distrito urbano sem malha exata carregada para esta cidade.',
        });
      });

      return;
    }

    area.unmatchedEntries.forEach(({ entry, normalizedEntry }) => {
      inconsistencies.push({
        aisId: area.id,
        entry,
        normalizedEntry,
        reason: 'missing_municipality_geometry',
        detail:
          area.scope === 'submunicipal'
            ? 'A entrada nao encontrou correspondencia na malha intraurbana carregada.'
            : 'O nome nao encontrou correspondencia direta com um municipio do GeoJSON apos normalizacao.',
      });
    });

    if (area.scope === 'submunicipal') {
      area.matchedSubmunicipalEntries.forEach(({ unit, entry, normalizedEntry }) => {
        const candidates = submunicipalAssignmentCandidates.get(unit.id) ?? [];
        candidates.push({
          aisId: area.id,
          entry,
          normalizedEntry,
          matchRatio: area.exactMatchCount / Math.max(area.totalEntries, 1),
          unit,
        });
        submunicipalAssignmentCandidates.set(unit.id, candidates);
      });

      return;
    }

    area.matchedMunicipalityEntries.forEach(({ municipalityName, entry, normalizedEntry }) => {
      const candidates = municipalAssignmentCandidates.get(municipalityName) ?? [];
      candidates.push({
        aisId: area.id,
        entry,
        normalizedEntry,
        matchRatio: area.exactMatchCount / Math.max(area.totalEntries, 1),
      });
      municipalAssignmentCandidates.set(municipalityName, candidates);
    });
  });

  const resolvedMunicipalAssignments = new Map<string, AssignmentCandidate>();
  municipalAssignmentCandidates.forEach((candidates, municipalityName) => {
    const { winner, duplicates } = resolveAssignmentWinner(candidates, (candidate) => candidate.aisId);
    resolvedMunicipalAssignments.set(municipalityName, winner);

    duplicates.forEach((duplicate) => {
      inconsistencies.push({
        aisId: duplicate.aisId,
        entry: duplicate.entry,
        normalizedEntry: duplicate.normalizedEntry,
        reason: 'duplicate_municipality_assignment',
        detail: `Municipio ja associado prioritariamente a outra AIS. Atribuicao preservada para ${municipalityName}.`,
      });
    });
  });

  const resolvedSubmunicipalAssignments = new Map<string, SubmunicipalAssignmentCandidate>();
  submunicipalAssignmentCandidates.forEach((candidates, unitId) => {
    const { winner, duplicates } = resolveAssignmentWinner(candidates, (candidate) => `${candidate.aisId}:${candidate.unit.name}`);
    resolvedSubmunicipalAssignments.set(unitId, winner);

    duplicates.forEach((duplicate) => {
      if (duplicate.aisId === winner.aisId) {
        return;
      }

      inconsistencies.push({
        aisId: duplicate.aisId,
        entry: duplicate.entry,
        normalizedEntry: duplicate.normalizedEntry,
        reason: 'duplicate_territorial_assignment',
        detail: `Unidade intraurbana ja vinculada prioritariamente a outra AIS. Atribuicao preservada para ${winner.unit.name}.`,
      });
    });
  });

  const submunicipalCoverageByMunicipality = new Map<string, Set<string>>();
  resolvedSubmunicipalAssignments.forEach((assignment) => {
    const municipalityAis = submunicipalCoverageByMunicipality.get(assignment.unit.municipalityName) ?? new Set<string>();
    municipalityAis.add(assignment.aisId);
    submunicipalCoverageByMunicipality.set(assignment.unit.municipalityName, municipalityAis);
  });

  const municipalities: MappedMunicipality[] = municipalitiesSource.features.map((feature) => {
    const municipalityName = feature.properties.name;
    const assignment = resolvedMunicipalAssignments.get(municipalityName);
    const submunicipalCoverage = submunicipalCoverageByMunicipality.get(municipalityName);
    const bounds = computeBounds(feature.geometry);
    const centroid = computeCentroid(feature.geometry);

    return {
      id: feature.properties.id,
      code: feature.properties.codarea,
      name: municipalityName,
      normalizedName: normalizeName(municipalityName),
      aisId: assignment?.aisId ?? null,
      aisColor: assignment ? getAisColor(assignment.aisId) : UNASSIGNED_MUNICIPALITY_COLOR,
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      geometry: feature.geometry,
      bounds,
      coverageStatus: assignment
        ? 'mapped'
        : submunicipalCoverage?.size
          ? 'submunicipal'
          : 'urban-detail-unassigned',
      popupNote: assignment
        ? undefined
        : submunicipalCoverage?.size
          ? `Cobertura exata subdividida entre ${submunicipalCoverage.size} AIS dentro do municipio.`
          : 'Cobertura informada por bairros ou distritos, sem associacao municipal unica carregada.',
      sourceEntry: assignment?.entry,
    };
  });

  const municipalitiesById = Object.fromEntries(
    municipalities.map((municipality) => [municipality.id, municipality]),
  );

  const municipalUnits: TerritorialUnit[] = municipalities
    .filter((municipality) => municipality.coverageStatus !== 'submunicipal')
    .map((municipality) => ({
      id: `municipality:${municipality.id}`,
      unitName: municipality.name,
      normalizedUnitName: municipality.normalizedName,
      municipalityId: municipality.id,
      municipalityName: municipality.name,
      municipalityNormalizedName: municipality.normalizedName,
      unitType: 'municipality',
      aisId: municipality.aisId,
      aisColor: municipality.aisColor,
      latitude: municipality.latitude,
      longitude: municipality.longitude,
      geometry: municipality.geometry,
      bounds: municipality.bounds,
      coverageStatus: municipality.coverageStatus,
      popupNote: municipality.popupNote,
      sourceEntry: municipality.sourceEntry,
    }));

  const neighborhoodUnits: TerritorialUnit[] = [...resolvedSubmunicipalAssignments.values()].flatMap(
    (assignment) => {
      const municipalityFeature = municipalityByNormalizedName.get(
        assignment.unit.municipalityNormalizedName,
      );

      if (!municipalityFeature) {
        return [];
      }

      return [
        {
          id: `submunicipal:${assignment.unit.id}`,
          unitName: assignment.unit.name,
          normalizedUnitName: assignment.unit.normalizedName,
          municipalityId: municipalityFeature.properties.id,
          municipalityName: assignment.unit.municipalityName,
          municipalityNormalizedName: assignment.unit.municipalityNormalizedName,
          unitType: 'submunicipal',
          aisId: assignment.aisId,
          aisColor: getAisColor(assignment.aisId),
          latitude: assignment.unit.latitude,
          longitude: assignment.unit.longitude,
          geometry: assignment.unit.geometry,
          bounds: assignment.unit.bounds,
          coverageStatus: 'mapped',
          sourceEntry: assignment.entry,
          popupNote: `Divisao intramunicipal oficial a partir da malha territorial carregada para ${assignment.unit.municipalityName}.`,
        },
      ];
    },
  );

  const territorialUnits = [...municipalUnits, ...neighborhoodUnits];
  const territorialUnitsById = Object.fromEntries(territorialUnits.map((unit) => [unit.id, unit]));
  const { units: resolvedPmUnits, issues: pmUnitIssues } = resolvePMUnits(
    pmUnitsSource,
    municipalities,
  );
  const { units: resolvedRaioBases, issues: raioIssues } = resolveRaioBases(
    raioBasesSource,
    municipalities,
  );
  const { pmUnits, pmUnitsById } = distributePMUnits([
    ...resolvedPmUnits,
    ...resolvedRaioBases,
  ]);

  const areas: AISArea[] = areaCandidates.map((area) => {
    const areaUnits = territorialUnits.filter((unit) => unit.aisId === area.id);
    const municipalityIds = [...new Set(areaUnits.map((unit) => unit.municipalityId))];
    const areaMunicipalities = municipalityIds
      .map((municipalityId) => municipalitiesById[municipalityId])
      .filter(Boolean);
    const aggregatedGeometry = dissolveGeometries(areaUnits.map((unit) => unit.geometry));
    const bounds = aggregatedGeometry
      ? computeBounds(aggregatedGeometry)
      : mergeBounds(areaUnits.map((unit) => unit.bounds));

    return {
      id: area.id,
      color: getAisColor(area.id),
      entries: area.entries,
      normalizedEntries: area.normalizedEntries,
      municipalities: areaMunicipalities,
      territorialUnits: areaUnits,
      municipalityIds,
      municipalityCount: municipalityIds.length,
      unitCount: areaUnits.length,
      unitLabel:
        area.scope === 'submunicipal'
          ? `${areaUnits.length} unidades`
          : `${municipalityIds.length} municipios`,
      missingEntries:
        area.scope === 'urban-detail'
          ? area.entries
          : area.unmatchedEntries.map(({ entry }) => entry),
      missingCount:
        area.scope === 'urban-detail' ? area.entries.length : area.unmatchedEntries.length,
      exactMatchCount: area.exactMatchCount,
      totalEntries: area.totalEntries,
      scope: area.scope,
      coverageLabel:
        area.scope === 'submunicipal'
          ? `Divisao exata por unidades territoriais em ${areaMunicipalities.map((municipality) => municipality.name).join(', ')}`
          : area.scope === 'urban-detail'
            ? 'Cobertura por bairros e distritos sem malha exata carregada'
            : 'Poligono agregado por municipios',
      aggregatedGeometry,
      bounds,
    };
  });

  const ranking = [...areas]
    .filter((area) => area.municipalityCount > 0)
    .sort((left, right) => {
      if (right.municipalityCount !== left.municipalityCount) {
        return right.municipalityCount - left.municipalityCount;
      }

      if (right.unitCount !== left.unitCount) {
        return right.unitCount - left.unitCount;
      }

      return left.id.localeCompare(right.id, 'pt-BR');
    })
    .map((area) => ({
      aisId: area.id,
      color: area.color,
      municipalityCount: area.municipalityCount,
      scope: area.scope,
    }));

  const mappedMunicipalities = municipalities.filter(
    (municipality) => municipality.coverageStatus !== 'urban-detail-unassigned',
  ).length;
  const totalMunicipalities = municipalities.length;
  const unassignedMunicipalities = totalMunicipalities - mappedMunicipalities;
  const mapBounds = mergeBounds(municipalities.map((municipality) => municipality.bounds)) as MapBounds;

  const dataset: TerritoryDataset = {
    areas,
    municipalities,
    municipalitiesById,
    territorialUnits,
    territorialUnitsById,
    pmUnits,
    pmUnitsById,
    pmUnitIssues: [...pmUnitIssues, ...raioIssues],
    inconsistencies,
    mapBounds,
    statistics: {
      totalAis: areas.length,
      municipalAis: areas.filter((area) => area.scope === 'municipal').length,
      submunicipalAis: areas.filter((area) => area.scope === 'submunicipal').length,
      urbanDetailAis: areas.filter((area) => area.scope === 'urban-detail').length,
      mappedMunicipalities,
      totalMunicipalities,
      unassignedMunicipalities,
      inconsistencies: inconsistencies.length,
      coveragePercentage: (mappedMunicipalities / totalMunicipalities) * 100,
      municipalitiesByAis: ranking,
      ranking,
    },
  };

  console.groupCollapsed?.('[AIS PMCE] Relatorio de cruzamento territorial');
  console.info?.('AIS totais:', dataset.statistics.totalAis);
  console.info?.('AIS com divisao exata:', dataset.statistics.submunicipalAis);
  console.info?.('Municipios cobertos:', dataset.statistics.mappedMunicipalities);
  console.info?.('Municipios ainda sem malha exata:', dataset.statistics.unassignedMunicipalities);
  console.info?.('Inconsistencias registradas:', dataset.statistics.inconsistencies);
  console.info?.('Unidades da PM posicionadas no mapa:', dataset.pmUnits.length);
  console.info?.('Unidades da PM com pendencia de localizacao:', dataset.pmUnitIssues.length);
  console.table?.(
    dataset.areas.map((area) => ({
      AIS: area.id,
      escopo: area.scope,
      municipios: area.municipalityCount,
      unidades: area.unitCount,
      entradas: area.totalEntries,
      pendencias: area.missingCount,
      dissolvido: area.aggregatedGeometry ? 'sim' : 'nao',
    })),
  );
  if (dataset.pmUnitIssues.length) {
    console.table?.(
      dataset.pmUnitIssues.map((issue) => ({
        unidade: issue.shortName,
        categoria: issue.categoryLabel,
        municipio: issue.municipalityName ?? 'sem sede',
        AIS: issue.aisId ?? 'sem AIS',
        detalhe: issue.detail,
      })),
    );
  }
  console.groupEnd?.();

  return dataset;
}

export async function loadTerritoryDataset() {
  const {
    aisSource,
    municipalitiesSource,
    fortalezaNeighborhoodsSource,
    caucaiaTerritorialUnitsSource,
    pmUnitsSource,
    raioBasesSource,
  } = await loadRawSources();
  await new Promise((resolve) => window.setTimeout(resolve, 360));

  return buildTerritoryDataset(
    aisSource,
    municipalitiesSource,
    fortalezaNeighborhoodsSource,
    caucaiaTerritorialUnitsSource,
    pmUnitsSource,
    raioBasesSource,
  );
}
