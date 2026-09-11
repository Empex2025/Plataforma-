import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller.js';
import { ContactsService } from './contacts.service.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [EventsModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
