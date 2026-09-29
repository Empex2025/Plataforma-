import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CEP_PROVIDER,
  type CepResult,
  type ICepProvider,
} from '@/common/providers/cep/cep-provider.interface.js';

@Injectable()
export class CepLookupService {
  constructor(@Inject(CEP_PROVIDER) private readonly provider: ICepProvider) {}

  async lookup(rawCep: string): Promise<CepResult> {
    const cep = rawCep.replace(/\D/g, '');

    if (cep.length !== 8) {
      throw new BadRequestException('O CEP deve conter 8 dígitos');
    }

    const result = await this.provider.lookup(cep);
    if (!result) {
      throw new NotFoundException('CEP não encontrado');
    }

    return result;
  }
}
