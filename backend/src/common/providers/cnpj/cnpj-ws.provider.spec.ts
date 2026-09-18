import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { CnpjWsProvider } from './cnpj-ws.provider.js';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

function makeConfig(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('CnpjWsProvider', () => {
  let provider: CnpjWsProvider;

  beforeEach(() => {
    provider = new CnpjWsProvider(
      makeConfig({ CNPJ_API_BASE_URL: 'https://publica.cnpj.ws', CNPJ_API_TIMEOUT_MS: '5000' }),
    );
    mockFetch.mockReset();
  });

  it('should map a 200 response to normalized company data', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        cnpj: '11222333000181',
        razao_social: 'EMPRESA EXEMPLO LTDA',
        estabelecimento: {
          nome_fantasia: 'Empresa Exemplo',
          situacao_cadastral: 'ATIVA',
          tipo_logradouro: 'AVENIDA',
          logradouro: 'PAULISTA',
          numero: '1000',
          complemento: 'SALA 10',
          bairro: 'BELA VISTA',
          cep: '01310100',
          ddd1: '11',
          telefone1: '33334444',
          email: 'contato@exemplo.com.br',
          cidade: { nome: 'SAO PAULO' },
          estado: { sigla: 'SP' },
          atividade_principal: { subclasse: '6201-5/01', descricao: 'Desenvolvimento de programas' },
        },
      }),
    } as Response);

    const result = await provider.findByCnpj('11222333000181');

    expect(result).not.toBeNull();
    expect(result!.cnpj).toBe('11222333000181');
    expect(result!.razaoSocial).toBe('EMPRESA EXEMPLO LTDA');
    expect(result!.nomeFantasia).toBe('Empresa Exemplo');
    expect(result!.situacaoCadastral).toBe('ATIVA');
    expect(result!.address?.logradouro).toBe('AVENIDA PAULISTA');
    expect(result!.address?.cidade).toBe('SAO PAULO');
    expect(result!.address?.estado).toBe('SP');
    expect(result!.telefone).toBe('1133334444');
    expect(result!.atividadePrincipal?.codigo).toBe('6201-5/01');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://publica.cnpj.ws/cnpj/11222333000181',
      expect.anything(),
    );
  });

  it('should return null for 404 (not found)', async () => {
    mockFetch.mockResolvedValue({ status: 404, ok: false } as Response);

    expect(await provider.findByCnpj('11222333000181')).toBeNull();
  });

  it('should throw RATE_LIMITED for 429', async () => {
    mockFetch.mockResolvedValue({ status: 429, ok: false } as Response);

    await expect(provider.findByCnpj('11222333000181')).rejects.toMatchObject({
      reason: 'RATE_LIMITED',
    });
  });

  it('should throw UNAVAILABLE for 5xx', async () => {
    mockFetch.mockResolvedValue({ status: 500, ok: false } as Response);

    await expect(provider.findByCnpj('11222333000181')).rejects.toMatchObject({
      reason: 'UNAVAILABLE',
    });
  });

  it('should throw TIMEOUT on abort', async () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    mockFetch.mockRejectedValue(error);

    await expect(provider.findByCnpj('11222333000181')).rejects.toMatchObject({
      reason: 'TIMEOUT',
    });
  });

  it('should throw UNAVAILABLE on network error', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));

    await expect(provider.findByCnpj('11222333000181')).rejects.toMatchObject({
      reason: 'UNAVAILABLE',
    });
  });

  it('should not call the provider for a non-14-digit CNPJ', async () => {
    expect(await provider.findByCnpj('123')).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
