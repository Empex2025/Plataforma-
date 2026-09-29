import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller.js';
import { CompaniesPublicController } from './companies-public.controller.js';
import { AdminCompaniesController } from './admin-companies.controller.js';
import { CompaniesService } from './services/companies.service.js';
import { CnpjLookupService } from './services/cnpj-lookup.service.js';
import { CepLookupService } from './services/cep-lookup.service.js';
import { MembersController } from './members/members.controller.js';
import { MembersService } from './members/services/members.service.js';
import { PlansModule } from '@/modules/plans/plans.module.js';
import { CnpjWsProvider } from '@/common/providers/cnpj/cnpj-ws.provider.js';
import { CNPJ_PROVIDER } from '@/common/providers/cnpj/cnpj.types.js';
import { ViaCepCepProvider } from '@/common/providers/cep/viacep-cep.provider.js';
import { CEP_PROVIDER } from '@/common/providers/cep/cep-provider.interface.js';

@Module({
  imports: [PlansModule],
  controllers: [CompaniesController, CompaniesPublicController, AdminCompaniesController, MembersController],
  providers: [
    CompaniesService,
    MembersService,
    CnpjLookupService,
    CnpjWsProvider,
    { provide: CNPJ_PROVIDER, useExisting: CnpjWsProvider },
    CepLookupService,
    ViaCepCepProvider,
    { provide: CEP_PROVIDER, useExisting: ViaCepCepProvider },
  ],
  exports: [CompaniesService, MembersService],
})
export class CompaniesModule {}
