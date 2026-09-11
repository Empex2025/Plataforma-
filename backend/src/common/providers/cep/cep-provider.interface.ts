export interface CepResult {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
}

export interface ICepProvider {
  lookup(cep: string): Promise<CepResult | null>;
}
