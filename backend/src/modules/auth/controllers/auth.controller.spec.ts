import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from '../services/auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
    requestVerification: jest.Mock;
    confirmVerification: jest.Mock;
    completeRegistration: jest.Mock;
    convertToPj: jest.Mock;
    getProfile: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      requestVerification: jest.fn(),
      confirmVerification: jest.fn(),
      completeRegistration: jest.fn(),
      convertToPj: jest.fn(),
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      service.register.mockResolvedValue({ user: {}, token: 'tok', refreshToken: 'ref' });

      const dto = {
        personType: 'PJ' as const,
        document: '11.222.333/0001-81',
        email: 'a@b.com',
        password: 'S3nhaF0rte!',
      };

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result.token).toBe('tok');
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      service.login.mockResolvedValue({ user: {}, token: 'tok', refreshToken: 'ref' });

      const result = await controller.login({
        email: 'a@b.com',
        password: 'S3nhaF0rte!',
      });

      expect(service.login).toHaveBeenCalled();
      expect(result.token).toBe('tok');
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh', async () => {
      service.refresh.mockResolvedValue({ user: {}, token: 'tok', refreshToken: 'ref' });

      const result = await controller.refresh({ refreshToken: 'ref' });

      expect(service.refresh).toHaveBeenCalledWith('ref');
      expect(result.refreshToken).toBe('ref');
    });
  });

  describe('logout', () => {
    it('should revoke the session', async () => {
      service.logout.mockResolvedValue(undefined);

      const result = await controller.logout({ refreshToken: 'ref' });

      expect(service.logout).toHaveBeenCalledWith('ref');
      expect(result.ok).toBe(true);
    });
  });

  describe('forgotPassword', () => {
    it('should request an OTP', async () => {
      service.forgotPassword.mockResolvedValue(undefined);

      const result = await controller.forgotPassword({ email: 'a@b.com' });

      expect(service.forgotPassword).toHaveBeenCalledWith('a@b.com');
      expect(result.ok).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should reset the password', async () => {
      service.resetPassword.mockResolvedValue(undefined);

      const dto = { email: 'a@b.com', otp: '123456', password: 'N3wPassword!' };
      const result = await controller.resetPassword(dto);

      expect(service.resetPassword).toHaveBeenCalledWith(dto);
      expect(result.ok).toBe(true);
    });
  });

  describe('getMe', () => {
    it('should call authService.getProfile with userId', async () => {
      service.getProfile.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      const result = await controller.getMe('u1');

      expect(service.getProfile).toHaveBeenCalledWith('u1');
      expect(result.id).toBe('u1');
    });
  });

  describe('verification', () => {
    it('should request a verification code', async () => {
      service.requestVerification.mockResolvedValue(undefined);

      const result = await controller.requestVerification('u1', {
        channel: 'email',
      });

      expect(service.requestVerification).toHaveBeenCalledWith('u1', 'email');
      expect(result.ok).toBe(true);
    });

    it('should confirm a verification code', async () => {
      service.confirmVerification.mockResolvedValue({ id: 'u1' });

      const result = await controller.confirmVerification('u1', {
        channel: 'email',
        code: '123456',
      });

      expect(service.confirmVerification).toHaveBeenCalledWith(
        'u1',
        'email',
        '123456',
      );
      expect(result.id).toBe('u1');
    });
  });

  describe('complete', () => {
    it('should complete the registration', async () => {
      service.completeRegistration.mockResolvedValue({ id: 'u1' });

      const dto = { type: 'PJ' as const, corporateName: 'Loja X' };
      const result = await controller.complete('u1', dto);

      expect(service.completeRegistration).toHaveBeenCalledWith('u1', dto);
      expect(result.id).toBe('u1');
    });
  });

  describe('convertToPj', () => {
    it('should convert a PF account to PJ', async () => {
      service.convertToPj.mockResolvedValue({ id: 'u1' });

      const dto = { cnpj: '11.222.333/0001-81', corporateName: 'Empresa X' };
      const result = await controller.convertToPj('u1', dto);

      expect(service.convertToPj).toHaveBeenCalledWith('u1', dto);
      expect(result.id).toBe('u1');
    });
  });
});
