import { Injectable, Logger } from '@nestjs/common';
import { ICepProvider, CepResult } from './cep-provider.interface.js';

const VIACEP_URL = 'https://viacep.com.br/ws';
const TIMEOUT_MS = 5000;
const CEP_REGEX = /^\d{5}-?\d{3}$/;

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

@Injectable()
export class ViaCepCepProvider implements ICepProvider {
  private readonly logger = new Logger(ViaCepCepProvider.name);

  async lookup(cep: string): Promise<CepResult | null> {
    const cleaned = cep.replace(/\D/g, '');

    if (!CEP_REGEX.test(cep) && !/^\d{8}$/.test(cleaned)) {
      this.logger.warn(`Invalid CEP format: ${cep}`);
      return null;
    }

    const formattedCep = cleaned;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(`${VIACEP_URL}/${formattedCep}/json/`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(`ViaCEP returned status ${response.status} for CEP ${formattedCep}`);
        return null;
      }

      const data: ViaCepResponse = await response.json() as ViaCepResponse;

      if (data.erro) {
        this.logger.warn(`CEP not found: ${formattedCep}`);
        return null;
      }

      return {
        cep: data.cep,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
        complement: data.complemento || undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`ViaCEP timeout for CEP ${formattedCep}`);
      } else {
        this.logger.error(`ViaCEP network error for CEP ${formattedCep}`, error);
      }
      return null;
    }
  }
}
