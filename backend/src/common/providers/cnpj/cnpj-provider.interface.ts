import type { CnpjCompanyData } from './cnpj.types.js';

export interface ICnpjProvider {
  /**
   * Looks up a company by its CNPJ (14 digits, no mask).
   * Returns `null` when the provider reports the CNPJ as not found.
   * Throws `CnpjProviderError` for provider failures (rate limit, timeout, unavailability).
   */
  findByCnpj(cnpj: string): Promise<CnpjCompanyData | null>;
}
