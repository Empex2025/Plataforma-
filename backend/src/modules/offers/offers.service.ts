import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}
}
