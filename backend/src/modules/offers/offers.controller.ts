import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OffersService } from './offers.service';

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}
}
