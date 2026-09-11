import { jest } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompanyRoleGuard } from './company-role.guard.js';
import { COMPANY_ROLE_KEY } from '../decorators/company-role.decorator.js';

describe('CompanyRoleGuard', () => {
  let guard: CompanyRoleGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new CompanyRoleGuard(reflector);
  });

  function createContext(userCompany: unknown) {
    const request = { userCompany };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  it('should allow when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(createContext(null))).toBe(true);
  });

  it('should allow owner when OWNER required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === COMPANY_ROLE_KEY) return ['MERCHANT_OWNER'];
      return undefined;
    });

    expect(guard.canActivate(createContext({ role: 'MERCHANT_OWNER' }))).toBe(true);
  });

  it('should deny manager when OWNER required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === COMPANY_ROLE_KEY) return ['MERCHANT_OWNER'];
      return undefined;
    });

    expect(() => guard.canActivate(createContext({ role: 'MERCHANT_MANAGER' }))).toThrow();
  });

  it('should deny when no userCompany', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === COMPANY_ROLE_KEY) return ['MERCHANT_OWNER'];
      return undefined;
    });

    expect(() => guard.canActivate(createContext(null))).toThrow();
  });
});
