import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../db/prisma.service.js';
import { COMPANY_SCOPE_KEY } from '../decorators/company-scope.decorator.js';
import { COMPANY_SCOPE_INACTIVE_KEY } from '../decorators/allow-inactive-company.decorator.js';
import { cacheResolvedMembership } from '../context/request-context.store.js';

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

    const allowInactive = this.reflector.getAllAndOverride<boolean>(COMPANY_SCOPE_INACTIVE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const companyId =
      request.headers['x-company-id'] ??
      request.params.companyId;

    if (!companyId) {
      throw new ForbiddenException('O identificador da empresa é obrigatório');
    }

    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: user.sub,
          companyId,
        },
      },
      include: {
        company: {
          select: { id: true, status: true, deletedAt: true },
        },
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('O usuário não pertence a esta empresa');
    }

    if (userCompany.company.deletedAt) {
      throw new NotFoundException('A empresa foi excluída');
    }

    if (userCompany.company.status === 'INACTIVE' && !allowInactive) {
      throw new ForbiddenException('A empresa está inativa');
    }

    request.userCompany = userCompany;

    cacheResolvedMembership(userCompany);

    return true;
  }
}
