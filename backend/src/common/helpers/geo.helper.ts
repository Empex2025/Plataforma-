export class GeoHelper {
  static makePoint(lng: number, lat: number): string {
    return `POINT(${lng} ${lat})`;
  }

  static withinRadiusClause(
    columnName: string,
    lng: number,
    lat: number,
    radiusMeters: number,
  ): string {
    const point = this.makePoint(lng, lat);
    return `ST_DWithin(${columnName}::geography, ST_SetSRID(ST_GeomFromText('${point}'), 4326)::geography, ${radiusMeters})`;
  }

  static distanceExpression(columnName: string, lng: number, lat: number): string {
    const point = this.makePoint(lng, lat);
    return `ST_Distance(${columnName}::geography, ST_SetSRID(ST_GeomFromText('${point}'), 4326)::geography)`;
  }
}
