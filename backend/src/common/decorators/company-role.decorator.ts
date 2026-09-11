import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';

export const COMPANY_ROLE_KEY = 'companyRole';

export const RequireCompanyRole = (...roles: UserRole[]) =>
  SetMetadata(COMPANY_ROLE_KEY, roles);

