
export interface ProductTextInput {
  name: string;
  description?: string | null;
  brandName?: string | null;
  categoryNames?: string[];
  tagNames?: string[];
}

export interface StoreTextInput {
  name: string;
  description?: string | null;
  categoryNames?: string[];
  city?: string | null;
  state?: string | null;
  productNames?: string[];
}

export interface OfferTextInput {
  title: string;
  description?: string | null;
  productNames?: string[];
  categoryNames?: string[];
  discountLabel?: string | null;
}

export function buildProductRepresentation(input: ProductTextInput): string {
  return normalize([
    input.name,
    input.description,
    input.brandName,
    joinList('Categorias', input.categoryNames),
    joinList('Características', input.tagNames),
  ]);
}

export function buildStoreRepresentation(input: StoreTextInput): string {
  return normalize([
    input.name,
    input.description,
    joinList('Categorias', input.categoryNames),
    joinList('Produtos', truncate(input.productNames, 20)),
    joinList('Localização', [input.city, input.state].filter(Boolean) as string[]),
  ]);
}

export function buildOfferRepresentation(input: OfferTextInput): string {
  return normalize([
    input.title,
    input.description,
    input.discountLabel,
    joinList('Produtos', input.productNames),
    joinList('Categorias', input.categoryNames),
  ]);
}

function joinList(label: string, values?: string[]): string | null {
  const clean = (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
  if (clean.length === 0) return null;
  return `${label}: ${clean.join(', ')}`;
}

function truncate(values: string[] | undefined, max: number): string[] | undefined {
  if (!values) return values;
  return values.slice(0, max);
}

function normalize(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ?? '').replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0)
    .join('. ');
}
