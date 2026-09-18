export const CNPJ_LENGTH = 14;

const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeCnpj(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

function checkDigit(base: string, weights: number[]): number {
  const sum = base
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);

  if (cnpj.length !== CNPJ_LENGTH) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const firstDigit = checkDigit(cnpj.slice(0, 12), FIRST_DIGIT_WEIGHTS);
  const secondDigit = checkDigit(cnpj.slice(0, 13), SECOND_DIGIT_WEIGHTS);

  return firstDigit === Number(cnpj[12]) && secondDigit === Number(cnpj[13]);
}
