import { isValidCnpj, isValidCpf, isValidDocument, onlyDigits } from './document.js';

describe('document validators', () => {
  describe('onlyDigits', () => {
    it('strips non-digit characters', () => {
      expect(onlyDigits('11.222.333/0001-81')).toBe('11222333000181');
    });
  });

  describe('isValidCpf', () => {
    it('accepts a valid CPF', () => {
      expect(isValidCpf('529.982.247-25')).toBe(true);
    });

    it('rejects an invalid CPF', () => {
      expect(isValidCpf('111.111.111-11')).toBe(false);
      expect(isValidCpf('529.982.247-24')).toBe(false);
    });
  });

  describe('isValidCnpj', () => {
    it('accepts a valid CNPJ', () => {
      expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    });

    it('rejects an invalid CNPJ', () => {
      expect(isValidCnpj('11.111.111/1111-11')).toBe(false);
      expect(isValidCnpj('11.222.333/0001-80')).toBe(false);
    });
  });

  describe('isValidDocument', () => {
    it('validates according to the person type', () => {
      expect(isValidDocument('529.982.247-25', 'PF')).toBe(true);
      expect(isValidDocument('529.982.247-25', 'PJ')).toBe(false);
      expect(isValidDocument('11.222.333/0001-81', 'PJ')).toBe(true);
      expect(isValidDocument('11.222.333/0001-81', 'PF')).toBe(false);
    });
  });
});
