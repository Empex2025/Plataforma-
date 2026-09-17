export { cn } from "cn"

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export function maskCpf(value: string): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

export function maskCnpj(value: string): string {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}

export function maskCpfCnpj(value: string): string {
  return onlyDigits(value).length <= 11 ? maskCpf(value) : maskCnpj(value)
}

export function maskCep(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2")
}

export function maskDate(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2")
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (!digits) return ""

  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)

  if (digits.length < 2) return digits
  if (rest.length <= 8) {
    const mid = rest.slice(0, 4)
    const end = rest.slice(4)
    return `(${ddd}) ${mid}${end ? `-${end}` : ""}`.trim()
  }
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

export function maskCurrency(value: string): string {
  const digits = onlyDigits(value)
  if (!digits) return ""

  const padded = digits.padStart(3, "0")
  const integer = padded.slice(0, -2).replace(/^0+/, "") || "0"
  const decimal = padded.slice(-2)
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  return `${formatted},${decimal}`
}
