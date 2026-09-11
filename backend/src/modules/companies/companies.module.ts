import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller.js';
import { CompaniesService } from './companies.service.js';
import { MembersController } from './members/members.controller.js';
import { MembersService } from './members/members.service.js';

@Module({
  controllers: [CompaniesController, MembersController],
  providers: [CompaniesService, MembersService],
  exports: [CompaniesService, MembersService],
})
export class CompaniesModule {}
