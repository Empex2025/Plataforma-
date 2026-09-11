import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    register: jest.Mock;
    login: jest.Mock;
    getProfile: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
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
      service.register.mockResolvedValue({ user: {}, token: 'tok' });

      const result = await controller.register({
        email: 'a@b.com',
        name: 'A',
        password: 'S3nhaF0rte!',
      });

      expect(service.register).toHaveBeenCalledWith({
        email: 'a@b.com',
        name: 'A',
        password: 'S3nhaF0rte!',
      });
      expect(result.token).toBe('tok');
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      service.login.mockResolvedValue({ user: {}, token: 'tok' });

      const result = await controller.login({
        email: 'a@b.com',
        password: 'S3nhaF0rte!',
      });

      expect(service.login).toHaveBeenCalled();
      expect(result.token).toBe('tok');
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
});
