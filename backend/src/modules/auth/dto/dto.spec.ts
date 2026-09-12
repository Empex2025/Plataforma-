import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto.js';
import { LoginDto } from './login.dto.js';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto.js';
import { ChangePasswordDto } from '@/modules/users/dto/change-password.dto.js';

describe('RegisterDto', () => {
  it('should validate a correct register DTO', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'user@example.com',
      name: 'Test User',
      password: 'S3nhaF0rte!',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid email', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'not-an-email',
      name: 'Test',
      password: 'S3nhaF0rte!',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should reject short password', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'a@b.com',
      name: 'Test',
      password: '1234567',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('should reject empty name', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'a@b.com',
      name: '',
      password: 'S3nhaF0rte!',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should accept input without unknown property errors (whitelist handled by ValidationPipe)', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'a@b.com',
      name: 'Test',
      password: 'S3nhaF0rte!',
      role: 'ADMIN',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect((dto as Record<string, unknown>).role).toBe('ADMIN');
  });
});

describe('LoginDto', () => {
  it('should validate a correct login DTO', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'user@example.com',
      password: 'S3nhaF0rte!',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid email', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'invalid',
      password: 'pass',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});

describe('UpdateUserDto', () => {
  it('should accept valid update fields', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      name: 'New Name',
      phone: '+5511999998888',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept input without unknown property errors (whitelist handled by ValidationPipe)', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      id: 'some-id',
      role: 'ADMIN',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept empty object', async () => {
    const dto = plainToInstance(UpdateUserDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

describe('ChangePasswordDto', () => {
  it('should validate a correct change password DTO', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 'OldPassword!',
      newPassword: 'N3wPassword!',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject short new password', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 'OldPassword!',
      newPassword: '1234567',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
  });

  it('should reject empty current password', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: '',
      newPassword: 'N3wPassword!',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'currentPassword')).toBe(true);
  });
});

describe('ValidationPipe whitelist behavior', () => {
  it('should strip unknown properties with whitelist only', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    });

    const input = {
      email: 'a@b.com',
      name: 'Test',
      password: 'S3nhaF0rte!',
      role: 'ADMIN',
      active: false,
      passwordHash: 'should-be-removed',
    };

    const dto = await pipe.transform(input, { type: 'body', metatype: RegisterDto });
    expect((dto as Record<string, unknown>).role).toBeUndefined();
    expect((dto as Record<string, unknown>).active).toBeUndefined();
    expect((dto as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((dto as Record<string, unknown>).email).toBe('a@b.com');
    expect((dto as Record<string, unknown>).name).toBe('Test');
  });

  it('should strip role, active, passwordHash from UpdateUserDto with whitelist only', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    });

    const input = {
      name: 'New Name',
      role: 'SUPER_ADMIN',
      active: false,
      passwordHash: 'hack-attempt',
      id: 'some-id',
    };

    const dto = await pipe.transform(input, { type: 'body', metatype: UpdateUserDto });
    expect((dto as Record<string, unknown>).name).toBe('New Name');
    expect((dto as Record<string, unknown>).role).toBeUndefined();
    expect((dto as Record<string, unknown>).active).toBeUndefined();
    expect((dto as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((dto as Record<string, unknown>).id).toBeUndefined();
  });

  it('should reject RegisterDto with forbidNonWhitelisted when extra fields sent', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    const input = {
      email: 'a@b.com',
      name: 'Test',
      password: 'S3nhaF0rte!',
      role: 'ADMIN',
    };

    await expect(
      pipe.transform(input, { type: 'body', metatype: RegisterDto }),
    ).rejects.toThrow();
  });

  it('should reject UpdateUserDto with forbidNonWhitelisted when extra fields sent', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    const input = {
      name: 'Test',
      role: 'ADMIN',
      active: false,
    };

    await expect(
      pipe.transform(input, { type: 'body', metatype: UpdateUserDto }),
    ).rejects.toThrow();
  });

  it('should reject ChangePasswordDto with forbidNonWhitelisted when extra fields sent', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    const input = {
      currentPassword: 'OldPass!',
      newPassword: 'N3wP4ss!',
      passwordHash: 'attempted-injection',
    };

    await expect(
      pipe.transform(input, { type: 'body', metatype: ChangePasswordDto }),
    ).rejects.toThrow();
  });
});
