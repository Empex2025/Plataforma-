import { jest } from '@jest/globals';
import { ViaCepCepProvider } from './viacep-cep.provider.js';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('ViaCepCepProvider', () => {
  let provider: ViaCepCepProvider;

  beforeEach(() => {
    provider = new ViaCepCepProvider();
    mockFetch.mockReset();
  });

  describe('lookup', () => {
    it('should return address for valid CEP', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          cep: '01001-000',
          logradouro: 'Praça da Sé',
          complemento: 'lado ímpar',
          bairro: 'Sé',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      } as Response);

      const result = await provider.lookup('01001-000');
      expect(result).not.toBeNull();
      expect(result!.street).toBe('Praça da Sé');
      expect(result!.city).toBe('São Paulo');
    });

    it('should return null for non-existent CEP', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ erro: true }),
      } as Response);

      const result = await provider.lookup('00000-000');
      expect(result).toBeNull();
    });

    it('should return null for invalid format', async () => {
      const result = await provider.lookup('abc');
      expect(result).toBeNull();
    });

    it('should return null on timeout', async () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      mockFetch.mockRejectedValue(error);

      const result = await provider.lookup('01001-000');
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await provider.lookup('01001-000');
      expect(result).toBeNull();
    });
  });
});
