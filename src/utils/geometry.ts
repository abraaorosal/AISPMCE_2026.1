import polygonClipping from 'polygon-clipping';

import type { MunicipalityGeometry, MapBounds } from '@/types';

type CoordinateVisitor = (longitude: number, latitude: number) => void;
type PolygonClippingGeometry = number[][][][];

function visitCoordinates(geometry: MunicipalityGeometry, visitor: CoordinateVisitor) {
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring) => {
      ring.forEach(([longitude, latitude]) => visitor(longitude, latitude));
    });

    return;
  }

  geometry.coordinates.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach(([longitude, latitude]) => visitor(longitude, latitude));
    });
  });
}

export function computeBounds(geometry: MunicipalityGeometry): MapBounds {
  let minLatitude = Number.POSITIVE_INFINITY;
  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;

  visitCoordinates(geometry, (longitude, latitude) => {
    minLatitude = Math.min(minLatitude, latitude);
    minLongitude = Math.min(minLongitude, longitude);
    maxLatitude = Math.max(maxLatitude, latitude);
    maxLongitude = Math.max(maxLongitude, longitude);
  });

  return [
    [minLatitude, minLongitude],
    [maxLatitude, maxLongitude],
  ];
}

export function computeCentroid(geometry: MunicipalityGeometry) {
  let latitudeTotal = 0;
  let longitudeTotal = 0;
  let coordinateCount = 0;

  visitCoordinates(geometry, (longitude, latitude) => {
    latitudeTotal += latitude;
    longitudeTotal += longitude;
    coordinateCount += 1;
  });

  if (!coordinateCount) {
    return { latitude: 0, longitude: 0 };
  }

  return {
    latitude: latitudeTotal / coordinateCount,
    longitude: longitudeTotal / coordinateCount,
  };
}

export function mergeBounds(boundsList: MapBounds[]): MapBounds | null {
  if (!boundsList.length) {
    return null;
  }

  let minLatitude = Number.POSITIVE_INFINITY;
  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;

  boundsList.forEach(([[south, west], [north, east]]) => {
    minLatitude = Math.min(minLatitude, south);
    minLongitude = Math.min(minLongitude, west);
    maxLatitude = Math.max(maxLatitude, north);
    maxLongitude = Math.max(maxLongitude, east);
  });

  return [
    [minLatitude, minLongitude],
    [maxLatitude, maxLongitude],
  ];
}

function geometryToMultiPolygonCoordinates(geometry: MunicipalityGeometry) {
  return (
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  ) as PolygonClippingGeometry;
}

export function dissolveGeometries(geometries: MunicipalityGeometry[]) {
  if (!geometries.length) {
    return null;
  }

  const preparedGeometries = geometries.map((geometry) => geometryToMultiPolygonCoordinates(geometry));
  let dissolvedGeometry = preparedGeometries[0] as PolygonClippingGeometry;

  for (const geometry of preparedGeometries.slice(1)) {
    dissolvedGeometry = (polygonClipping.union as (...input: unknown[]) => unknown)(
      dissolvedGeometry,
      geometry,
    ) as PolygonClippingGeometry;
  }

  if (!dissolvedGeometry?.length) {
    return null;
  }

  return dissolvedGeometry.length === 1
    ? {
        type: 'Polygon' as const,
        coordinates: dissolvedGeometry[0],
      }
    : {
        type: 'MultiPolygon' as const,
        coordinates: dissolvedGeometry,
      };
}
