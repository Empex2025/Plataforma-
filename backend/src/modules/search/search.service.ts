import { Injectable, Logger } from '@nestjs/common';
import {
  ISearchProvider,
  SearchDocument,
  SearchQuery,
  SearchResult,
} from '../../common/interfaces/search-provider.interface';

/**
 * SearchService — Ponto de entrada para operações de busca.
 *
 * NÃO implementa mecanismo de busca (Meilisearch, etc.) neste momento.
 * Usa ISearchProvider como contrato para que o provider possa ser injetado
 * futuramente sem alterar os consumers deste service.
 *
 * Quando nenhum provider estiver registrado, os métodos retornam resultados vazios
 * e emitem um log de warning.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private provider: ISearchProvider | null = null;

  /**
   * Registra um search provider (chamado pelo módulo que o implementar).
   */
  setProvider(provider: ISearchProvider): void {
    this.provider = provider;
  }

  async indexDocument(document: SearchDocument): Promise<void> {
    if (!this.provider) {
      this.logger.warn('Search provider not configured — skipping indexDocument');
      return;
    }
    await this.provider.indexDocument(document);
  }

  async removeDocument(id: string, type: string): Promise<void> {
    if (!this.provider) {
      this.logger.warn('Search provider not configured — skipping removeDocument');
      return;
    }
    await this.provider.removeDocument(id, type);
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    if (!this.provider) {
      this.logger.warn('Search provider not configured — returning empty result');
      return { documents: [], total: 0, query };
    }
    return this.provider.search(query);
  }
}
