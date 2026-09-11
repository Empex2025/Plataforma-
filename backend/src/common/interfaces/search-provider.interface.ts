/**
 * ISearchProvider — Contrato para mecanismos de busca.
 *
 * O módulo Search usa esta interface para não se acoplar a uma tecnologia específica.
 * Implementações futuras: Meilisearch, Elasticsearch, pg全文, etc.
 *
 * Para NÃO implementar agora:
 *   - Não instalar Meilisearch ou similar.
 *   - Não criar endpoints de busca.
 *   - Apenas definir o contrato para que o módulo esteja preparado.
 */
export interface SearchDocument {
  id: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchQuery {
  term: string;
  type?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

export interface SearchResult {
  documents: SearchDocument[];
  total: number;
  query: SearchQuery;
}

export interface ISearchProvider {
  /**
   * Indexa um documento no mecanismo de busca.
   */
  indexDocument(document: SearchDocument): Promise<void>;

  /**
   * Remove um documento do índice.
   */
  removeDocument(id: string, type: string): Promise<void>;

  /**
   * Busca documentos por termo.
   */
  search(query: SearchQuery): Promise<SearchResult>;

  /**
   * Inicializa o provider (criar índices, conexões, etc.).
   */
  initialize(): Promise<void>;

  /**
   * Encerra o provider (fechar conexões, etc.).
   */
  shutdown(): Promise<void>;
}
