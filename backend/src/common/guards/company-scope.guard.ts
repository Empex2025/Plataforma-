import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../db/prisma.service.js';
import { COMPANY_SCOPE_KEY } from '../decorators/company-scope.decorator.js';

@Injectable()
export class CompanyScopeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const needsScope = this.reflector.getAllAndOverride<boolean>(COMPANY_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!needsScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const companyId =
      request.headers['x-company-id'] ??
      request.params.companyId;

    if (!companyId) {
      throw new ForbiddenException('Company ID is required');
    }

    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: user.sub,
          companyId,
        },
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('User does not belong to this company');
    }

    request.userCompany = userCompany;

    return true;
  }
}
