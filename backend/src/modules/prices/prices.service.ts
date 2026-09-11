import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class PricesService {
  constructor(private readonly prisma: PrismaService) {}
}
