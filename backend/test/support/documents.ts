const digits = (length: number, values: number[]): number => {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += values[index] * (length + 1 - index);
  }
  return ((sum * 10) % 11) % 10;
};

function withCheckDigits(base: number[]): string {
  const first = digits(base.length, base);
  const second = digits(base.length + 1, [...base, first]);
  return [...base, first, second].join('');
}

function randomBase(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 9) + 1);
}

/**
 * Generates a CPF that passes `isValidCpf`, unique enough for tests since
 * `users.document` carries a unique constraint.
 */
export function validCpf(): string {
  const cpf = withCheckDigits(randomBase(9));
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
