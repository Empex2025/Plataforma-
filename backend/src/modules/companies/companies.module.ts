import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller.js';
import { CompaniesService } from './companies.service.js';
import { MembersController } from './members/members.controller.js';
import { MembersService } from './members/members.service.js';
import { PlansModule } from '../plans/plans.module.js';

@Module({
  imports: [PlansModule],
  controllers: [CompaniesController, MembersController],
  providers: [CompaniesService, MembersService],
  exports: [CompaniesService, MembersService],
})
export class CompaniesModule {}
