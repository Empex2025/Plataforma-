import { jest } from '@jest/globals';
import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { App } from 'supertest/types';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { AppModule } from './../src/app.module.js';
import {
  CNPJ_PROVIDER,
  CnpjProviderError,
} from './../src/common/providers/cnpj/cnpj.types.js';

function makeValidCnpj(seed: string): string {
  const base = seed.padStart(12, '0').slice(0, 12);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calc = (value: string, weights: number[]): number => {
    const sum = value
      .split('')
      .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const first = calc(base, w1);
  const second = calc(base + first, w2);
  return `${base}${first}${second}`;
}

function maskCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

describe('CNPJ lookup (e2e)', () => {
  let app: INestApplication<App>;
  const provider = { findByCnpj: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CNPJ_PROVIDER)
      .useValue(provider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    provider.findByCnpj.mockReset();
  });

  it('returns normalized company data for a valid CNPJ', async () => {
    const cnpj = makeValidCnpj('112223330001');
    provider.findByCnpj.mockResolvedValue({
      cnpj,
      razaoSocial: 'EMPRESA EXEMPLO LTDA',
      nomeFantasia: 'Empresa Exemplo',
      situacaoCadastral: 'ATIVA',
      address: { cidade: 'SAO PAULO', estado: 'SP', logradouro: 'AVENIDA PAULISTA' },
      atividadePrincipal: { codigo: '6201-5/01', descricao: 'Desenvolvimento de programas' },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/companies/cnpj/${cnpj}`)
      .expect(200);

    expect(res.body.cnpj).toBe(cnpj);
    expect(res.body.razaoSocial).toBe('EMPRESA EXEMPLO LTDA');
    expect(res.body.address.cidade).toBe('SAO PAULO');
    expect(res.body.atividadePrincipal.codigo).toBe('6201-5/01');
  });

  it('accepts a masked CNPJ in the URL and normalizes it', async () => {
    const cnpj = makeValidCnpj('112223330002');
    provider.findByCnpj.mockResolvedValue({ cnpj, razaoSocial: 'MASKED CO' });

    const res = await request(app.getHttpServer())
      .get(`/api/companies/cnpj/${encodeURIComponent(maskCnpj(cnpj))}`)
      .expect(200);

    expect(res.body.cnpj).toBe(cnpj);
    expect(provider.findByCnpj).toHaveBeenCalledWith(cnpj);
  });

  it('returns 400 for an invalid CNPJ and does not call the provider', async () => {
    await request(app.getHttpServer()).get('/api/companies/cnpj/123').expect(400);
    await request(app.getHttpServer()).get('/api/companies/cnpj/11222333000180').expect(400);

    expect(provider.findByCnpj).not.toHaveBeenCalled();
  });

  it('returns 404 when the provider reports the CNPJ as not found', async () => {
    const cnpj = makeValidCnpj('112223330003');
    provider.findByCnpj.mockResolvedValue(null);

    await request(app.getHttpServer()).get(`/api/companies/cnpj/${cnpj}`).expect(404);
  });

  it('returns 429 when the provider is rate limited', async () => {
    const cnpj = makeValidCnpj('112223330004');
    provider.findByCnpj.mockRejectedValue(new CnpjProviderError('RATE_LIMITED', 'rate limited'));

    await request(app.getHttpServer()).get(`/api/companies/cnpj/${cnpj}`).expect(429);
  });

  it('returns 503 when the provider is unavailable', async () => {
    const cnpj = makeValidCnpj('112223330005');
    provider.findByCnpj.mockRejectedValue(new CnpjProviderError('UNAVAILABLE', 'down'));

    await request(app.getHttpServer()).get(`/api/companies/cnpj/${cnpj}`).expect(503);
  });

  it('does not leak raw provider fields to the client', async () => {
    const cnpj = makeValidCnpj('112223330006');
    provider.findByCnpj.mockResolvedValue({
      cnpj,
      razaoSocial: 'SAFE CO',
      socios: [{ nome: 'Fulano de Tal' }],
      rawSecret: 'do-not-leak',
    } as never);

    const res = await request(app.getHttpServer())
      .get(`/api/companies/cnpj/${cnpj}`)
      .expect(200);

    expect(res.body.socios).toBeUndefined();
    expect(res.body.rawSecret).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Fulano');
  });
});
