export interface ICnpjProvider {
  validate(cnpj: string): boolean;
}
