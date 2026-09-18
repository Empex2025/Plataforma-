import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COMPANY_ROLE_KEY } from '../decorators/company-role.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Injectable()
export class CompanyRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(COMPANY_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userCompany = request.userCompany;

    if (!userCompany) {
      throw new ForbiddenException('Contexto da empresa não disponível');
    }

    const hasRole = requiredRoles.includes(userCompany.role as UserRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Permissão insuficiente na empresa. Necessário: ${requiredRoles.join(' ou ')}`,
      );
    }

    return true;
  }
}

