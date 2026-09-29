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

export type CreateStoreRequest = {
  name: string
  zipCode?: string
  address?: string
  complement?: string
  city?: string
  state?: string
  phone?: string
  whatsapp?: string
  email?: string
  lat: number
  lng: number
}

export type UpdateStoreRequest = {
  name?: string
  description?: string
  phone?: string
  whatsapp?: string
  email?: string
  address?: string
  addressNum?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  logoUrl?: string
  coverUrl?: string
  instagram?: string
  lat?: number
  lng?: number
}

export type Store = {
  id: string
  companyId: string
  name: string
  slug: string
  description?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  address?: string | null
  complement?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  logoUrl?: string | null
  coverUrl?: string | null
  instagram?: string | null
  status: string
  createdAt?: string
  updatedAt?: string
}
