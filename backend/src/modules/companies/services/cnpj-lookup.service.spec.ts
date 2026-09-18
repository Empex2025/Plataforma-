import { jest } from '@jest/globals';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CnpjLookupService } from './cnpj-lookup.service.js';
import { CnpjProviderError } from '@/common/providers/cnpj/cnpj.types.js';
import type { ICnpjProvider } from '@/common/providers/cnpj/cnpj-provider.interface.js';

describe('CnpjLookupService', () => {
  let service: CnpjLookupService;
  let provider: { findByCnpj: jest.Mock };

  const data = { cnpj: '11222333000181', razaoSocial: 'EMPRESA EXEMPLO LTDA' };

  beforeEach(() => {
    provider = { findByCnpj: jest.fn().mockResolvedValue(data) };
    const config = {
      get: (key: string) => (key === 'CNPJ_CACHE_TTL_MS' ? '300000' : undefined),
    } as unknown as ConfigService;

    service = new CnpjLookupService(provider as unknown as ICnpjProvider, config);
  });

  it('should return normalized data for a valid CNPJ', async () => {
    const result = await service.lookup('11222333000181');

    expect(result).toEqual(data);
    expect(provider.findByCnpj).toHaveBeenCalledWith('11222333000181');
  });

  it('should normalize a masked CNPJ before querying the provider', async () => {
    await service.lookup('11.222.333/0001-81');

    expect(provider.findByCnpj).toHaveBeenCalledWith('11222333000181');
  });

  it('should reject a CNPJ with the wrong length without calling the provider', async () => {
    await expect(service.lookup('123')).rejects.toThrow(BadRequestException);
    expect(provider.findByCnpj).not.toHaveBeenCalled();
  });

  it('should reject a CNPJ with invalid check digits without calling the provider', async () => {
    await expect(service.lookup('11222333000180')).rejects.toThrow(BadRequestException);
    expect(provider.findByCnpj).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when the provider finds nothing', async () => {
    provider.findByCnpj.mockResolvedValue(null);

    await expect(service.lookup('11222333000181')).rejects.toThrow(NotFoundException);
  });

  it('should map RATE_LIMITED to HTTP 429', async () => {
    provider.findByCnpj.mockRejectedValue(new CnpjProviderError('RATE_LIMITED', 'rate'));

    await expect(service.lookup('11222333000181')).rejects.toMatchObject({
      response: { statusCode: 429 },
    });
  });

  it('should map TIMEOUT to service unavailable', async () => {
    provider.findByCnpj.mockRejectedValue(new CnpjProviderError('TIMEOUT', 'timeout'));

    await expect(service.lookup('11222333000181')).rejects.toThrow(ServiceUnavailableException);
  });

  it('should map UNAVAILABLE to service unavailable', async () => {
    provider.findByCnpj.mockRejectedValue(new CnpjProviderError('UNAVAILABLE', 'down'));

    await expect(service.lookup('11222333000181')).rejects.toThrow(ServiceUnavailableException);
  });

  it('should cache successful lookups (normalized key)', async () => {
    await service.lookup('11222333000181');
    await service.lookup('11.222.333/0001-81');

    expect(provider.findByCnpj).toHaveBeenCalledTimes(1);
  });

  it('should not cache provider errors', async () => {
    provider.findByCnpj.mockRejectedValueOnce(new CnpjProviderError('UNAVAILABLE', 'down'));
    await expect(service.lookup('11222333000181')).rejects.toThrow(ServiceUnavailableException);

    provider.findByCnpj.mockResolvedValueOnce(data);
    const result = await service.lookup('11222333000181');

    expect(result).toEqual(data);
    expect(provider.findByCnpj).toHaveBeenCalledTimes(2);
  });
});
