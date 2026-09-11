import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;
  let service: {
    findById: jest.Mock;
    updateProfile: jest.Mock;
    changePassword: jest.Mock;
    deactivate: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findById: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return user profile', async () => {
      service.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      const result = await controller.getMe('u1');
      expect(result.id).toBe('u1');
    });
  });

  describe('updateMe', () => {
    it('should update user profile', async () => {
      service.updateProfile.mockResolvedValue({ id: 'u1', name: 'New' });
      const result = await controller.updateMe('u1', { name: 'New' });
      expect(result.name).toBe('New');
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      service.changePassword.mockResolvedValue(undefined);
      const result = await controller.changePassword('u1', {
        currentPassword: 'Old',
        newPassword: 'N3wP4ss!',
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('deactivate', () => {
    it('should deactivate account', async () => {
      service.deactivate.mockResolvedValue(undefined);
      const result = await controller.deactivate('u1');
      expect(result).toEqual({ success: true });
    });
  });
});
