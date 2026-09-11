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
      throw new ForbiddenException('Company context not available');
    }

    const hasRole = requiredRoles.includes(userCompany.role as UserRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient company role. Required: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}

