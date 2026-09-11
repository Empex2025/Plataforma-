/**
 * GeoHelper — Abstração para operações geoespaciais com PostGIS.
 *
 * Este módulo NÃO implementa endpoints de busca.
 * Fornece utilitários para uso com prisma.$queryRaw em services de Store.
 *
 * Exemplo de uso:
 *   const point = GeoHelper.makePoint(-46.6333, -23.5505);
 *   await prisma.$queryRaw`
 *     SELECT * FROM stores
 *     WHERE ST_DWithin(location, ${point}::geography, ${radiusMeters})
 *     ORDER BY ST_Distance(location, ${point}::geography)
 *   `;
 */
export class GeoHelper {
  /**
   * Cria um ponto WKT (Well-Known Text) a partir de longitude e latitude.
   * Uso: passe o resultado diretamente em queries raw do Prisma.
   *
   * @param lng - Longitude (ex: -46.6333)
   * @param lat - Latitude (ex: -23.5505)
   * @returns String WKT: 'POINT(lng lat)'
   */
  static makePoint(lng: number, lat: number): string {
    return `POINT(${lng} ${lat})`;
  }

  /**
   * Monta a cláusula SQL para buscar registros dentro de um raio.
   * Retorna um template string Prisma-safe para uso com $queryRaw.
   *
   * Exemplo:
   *   const where = GeoHelper.withinRadiusClause('location', -46.6333, -23.5505, 5000);
   *   const stores = await prisma.$queryRaw`
   *     SELECT * FROM stores WHERE ${where}
   *   `;
   */
  static withinRadiusClause(
    columnName: string,
    lng: number,
    lat: number,
    radiusMeters: number,
  ): string {
    const point = this.makePoint(lng, lat);
    return `ST_DWithin(${columnName}::geography, ST_SetSRID(ST_GeomFromText('${point}'), 4326)::geography, ${radiusMeters})`;
  }

  /**
   * Monta a expressão SQL para calcular distância em metros.
   * Útil para ORDER BY em consultas de proximidade.
   */
  static distanceExpression(columnName: string, lng: number, lat: number): string {
    const point = this.makePoint(lng, lat);
    return `ST_Distance(${columnName}::geography, ST_SetSRID(ST_GeomFromText('${point}'), 4326)::geography)`;
  }
}
