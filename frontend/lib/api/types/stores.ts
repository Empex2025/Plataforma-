export type StoreHour = {
  days: string[]
  start: string
  end: string
}

export type StoreOnboardingRequest = {
  name: string
  zipCode?: string
  address?: string
  complement?: string
  cityState?: string
  phone?: string
  whatsapp?: string
  instagram?: string
  logoUrl?: string
  coverUrl?: string
  hours?: StoreHour[]
  lat: number
  lng: number
}

export type Store = {
  id: string
  companyId: string
  name: string
  slug: string
  status: string
}
