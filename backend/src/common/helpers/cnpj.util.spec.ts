import { isValidCnpj, normalizeCnpj } from './cnpj.util.js';

describe('cnpj.util', () => {
  describe('normalizeCnpj', () => {
    it('should strip mask characters', () => {
      expect(normalizeCnpj('11.222.333/0001-81')).toBe('11222333000181');
      expect(normalizeCnpj('11222333000181')).toBe('11222333000181');
      expect(normalizeCnpj('  11 222 333 0001 81 ')).toBe('11222333000181');
    });
  });

  describe('isValidCnpj', () => {
    it('should accept a valid unmasked CNPJ', () => {
      expect(isValidCnpj('11222333000181')).toBe(true);
    });

    it('should accept a valid masked CNPJ', () => {
      expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    });

    it('should reject an invalid check digit', () => {
      expect(isValidCnpj('11222333000180')).toBe(false);
    });

    it('should reject a CNPJ with wrong length', () => {
      expect(isValidCnpj('1122233300018')).toBe(false);
      expect(isValidCnpj('112223330001811')).toBe(false);
      expect(isValidCnpj('')).toBe(false);
    });

    it('should reject repeated-digit CNPJs', () => {
      expect(isValidCnpj('00000000000000')).toBe(false);
      expect(isValidCnpj('11111111111111')).toBe(false);
    });

    it('should reject non-numeric input', () => {
      expect(isValidCnpj('abcdefghijklmn')).toBe(false);
    });
  });
});
