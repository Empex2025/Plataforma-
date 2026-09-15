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
  indexDocument(document: SearchDocument): Promise<void>;

  removeDocument(id: string, type: string): Promise<void>;

  search(query: SearchQuery): Promise<SearchResult>;

  initialize(): Promise<void>;

  shutdown(): Promise<void>;
}
