export type PersonType = 'PF' | 'PJ';

export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);
  for (let position = 9; position < 11; position++) {
    let sum = 0;
    for (let index = 0; index < position; index++) {
      sum += digits[index] * (position + 1 - index);
    }
    const checkDigit = ((sum * 10) % 11) % 10;
    if (checkDigit !== digits[position]) return false;
  }
  return true;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split('').map(Number);
  const calculateDigit = (length: number): number => {
    let sum = 0;
    let weight = length - 7;
    for (let index = 0; index < length; index++) {
      sum += digits[index] * weight--;
      if (weight < 2) weight = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  if (calculateDigit(12) !== digits[12]) return false;
  if (calculateDigit(13) !== digits[13]) return false;
  return true;
}

export function isValidDocument(value: string, personType: PersonType): boolean {
  return personType === 'PF' ? isValidCpf(value) : isValidCnpj(value);
}
