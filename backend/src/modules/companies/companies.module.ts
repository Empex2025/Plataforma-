import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller.js';
import { CompaniesPublicController } from './companies-public.controller.js';
import { CompaniesService } from './services/companies.service.js';
import { CnpjLookupService } from './services/cnpj-lookup.service.js';
import { MembersController } from './members/members.controller.js';
import { MembersService } from './members/services/members.service.js';
import { PlansModule } from '@/modules/plans/plans.module.js';
import { CnpjWsProvider } from '@/common/providers/cnpj/cnpj-ws.provider.js';
import { CNPJ_PROVIDER } from '@/common/providers/cnpj/cnpj.types.js';

@Module({
  imports: [PlansModule],
  controllers: [CompaniesController, CompaniesPublicController, MembersController],
  providers: [
    CompaniesService,
    MembersService,
    CnpjLookupService,
    CnpjWsProvider,
    { provide: CNPJ_PROVIDER, useExisting: CnpjWsProvider },
  ],
  exports: [CompaniesService, MembersService],
})
export class CompaniesModule {}
