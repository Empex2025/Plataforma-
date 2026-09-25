export type Store = {
  id: string
  name: string
  type: string
  active: boolean
}

export const accountData = {
  cnpj: "32.023.645/0001-06",
  email: "contato@provedor.com",
  razaoSocial: "Loja da Esquina LTDA",
  nomeFantasia: "Loja da Esquina",
  representante: "Carlos Eduardo da Silva",
  lastUpdate: "12 Out 2026",
}

export const stores: Store[] = [
  { id: "1", name: "Silva Importados - Matriz", type: "Física & Online", active: true },
]
