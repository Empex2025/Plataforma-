import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}
}
