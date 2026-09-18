import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICnpjProvider } from './cnpj-provider.interface.js';
import { CnpjCompanyData, CnpjProviderError } from './cnpj.types.js';
import { normalizeCnpj } from '@/common/helpers/cnpj.util.js';

const DEFAULT_BASE_URL = 'https://publica.cnpj.ws';
const DEFAULT_TIMEOUT_MS = 5000;
const CNPJ_LENGTH = 14;

interface CnpjWsEstabelecimento {
  nome_fantasia?: string | null;
  situacao_cadastral?: string | null;
  tipo_logradouro?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  ddd1?: string | null;
  telefone1?: string | null;
  email?: string | null;
  cidade?: { nome?: string | null } | null;
  estado?: { sigla?: string | null } | null;
  atividade_principal?: { subclasse?: string | null; descricao?: string | null } | null;
}

interface CnpjWsResponse {
  cnpj?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  situacao_cadastral?: string | null;
  estabelecimento?: CnpjWsEstabelecimento | null;
}

@Injectable()
export class CnpjWsProvider implements ICnpjProvider {
  private readonly logger = new Logger(CnpjWsProvider.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = (config.get<string>('CNPJ_API_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/+$/, '');

    const timeout = Number(config.get<string>('CNPJ_API_TIMEOUT_MS'));
    this.timeoutMs = Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
  }

  async findByCnpj(cnpj: string): Promise<CnpjCompanyData | null> {
    const normalized = normalizeCnpj(cnpj);
    if (normalized.length !== CNPJ_LENGTH) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/cnpj/${normalized}`, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });

      if (response.status === 404) return null;

      if (response.status === 429) {
        throw new CnpjProviderError('RATE_LIMITED', 'CNPJ provider rate limit reached');
      }

      if (!response.ok) {
        throw new CnpjProviderError('UNAVAILABLE', `CNPJ provider returned status ${response.status}`);
      }

      const data = (await response.json()) as CnpjWsResponse;
      return this.map(data, normalized);
    } catch (error) {
      if (error instanceof CnpjProviderError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new CnpjProviderError('TIMEOUT', 'CNPJ provider timed out');
      }

      this.logger.warn(`CNPJ provider request failed: ${(error as Error).message}`);
      throw new CnpjProviderError('UNAVAILABLE', 'CNPJ provider is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  private map(data: CnpjWsResponse, fallbackCnpj: string): CnpjCompanyData {
    const estabelecimento = data.estabelecimento ?? {};

    return {
      cnpj: normalizeCnpj(data.cnpj ?? '') || fallbackCnpj,
      razaoSocial: this.clean(data.razao_social) ?? '',
      nomeFantasia: this.clean(estabelecimento.nome_fantasia ?? data.nome_fantasia),
      situacaoCadastral: this.clean(estabelecimento.situacao_cadastral ?? data.situacao_cadastral),
      address: {
        cep: this.clean(estabelecimento.cep),
        logradouro: this.joinLogradouro(estabelecimento.tipo_logradouro, estabelecimento.logradouro),
        numero: this.clean(estabelecimento.numero),
        complemento: this.clean(estabelecimento.complemento),
        bairro: this.clean(estabelecimento.bairro),
        cidade: this.clean(estabelecimento.cidade?.nome),
        estado: this.clean(estabelecimento.estado?.sigla),
      },
      telefone: this.joinPhone(estabelecimento.ddd1, estabelecimento.telefone1),
      email: this.clean(estabelecimento.email),
      atividadePrincipal: {
        codigo: this.clean(estabelecimento.atividade_principal?.subclasse),
        descricao: this.clean(estabelecimento.atividade_principal?.descricao),
      },
    };
  }

  private joinLogradouro(tipo?: string | null, logradouro?: string | null): string | null {
    const parts = [tipo, logradouro]
      .map((part) => part?.trim())
      .filter((part): part is string => !!part);

    return parts.length > 0 ? parts.join(' ') : null;
  }

  private joinPhone(ddd?: string | null, phone?: string | null): string | null {
    const cleanDdd = (ddd ?? '').replace(/\D/g, '');
    const cleanPhone = (phone ?? '').replace(/\D/g, '');

    if (!cleanDdd && !cleanPhone) return null;
    return `${cleanDdd}${cleanPhone}`;
  }

  private clean(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
