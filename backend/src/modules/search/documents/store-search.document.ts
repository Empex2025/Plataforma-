export interface StoreSearchDocument {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  _geo: { lat: number; lng: number } | null;
  categoryNames: string[];
  active: boolean;
  updatedAt: string;
}
