import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}
}
