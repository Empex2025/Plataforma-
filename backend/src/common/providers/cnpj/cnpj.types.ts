export const CNPJ_PROVIDER = 'ICnpjProvider';

export interface CnpjAddress {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export interface CnpjActivity {
  codigo?: string | null;
  descricao?: string | null;
}

/**
 * Normalized company data returned by any CNPJ provider.
 * Only fields useful for the EncontraÊ company registration are exposed —
 * no partners, personal data or unrelated registry details.
 */
export interface CnpjCompanyData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  situacaoCadastral?: string | null;
  address?: CnpjAddress;
  telefone?: string | null;
  email?: string | null;
  atividadePrincipal?: CnpjActivity;
}

export type CnpjProviderFailureReason = 'RATE_LIMITED' | 'TIMEOUT' | 'UNAVAILABLE';

export class CnpjProviderError extends Error {
  constructor(
    readonly reason: CnpjProviderFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'CnpjProviderError';
  }
}
