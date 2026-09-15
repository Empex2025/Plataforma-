import {
  buildOfferRepresentation,
  buildProductRepresentation,
  buildStoreRepresentation,
} from './text-representation.js';

describe('text-representation', () => {
  it('is deterministic for the same input', () => {
    const input = { name: 'Tênis Runner', description: 'Leve', categoryNames: ['Calçados'] };
    expect(buildProductRepresentation(input)).toBe(buildProductRepresentation(input));
  });

  it('includes product name, description, brand, categories and tags', () => {
    const text = buildProductRepresentation({
      name: 'Tênis Runner',
      description: 'Ideal para corrida',
      brandName: 'Acme',
      categoryNames: ['Calçados'],
      tagNames: ['Confortável'],
    });

    expect(text).toContain('Tênis Runner');
    expect(text).toContain('Ideal para corrida');
    expect(text).toContain('Acme');
    expect(text).toContain('Calçados');
    expect(text).toContain('Confortável');
  });

  it('does not include price or user/internal fields', () => {
    const text = buildProductRepresentation({ name: 'Tênis', description: null });
    expect(text).not.toMatch(/price|preço|userId|inventory|estoque/i);
  });

  it('builds store representation with location and products', () => {
    const text = buildStoreRepresentation({
      name: 'Loja Central',
      description: 'Mercado do bairro',
      city: 'Fortaleza',
      state: 'CE',
      productNames: ['Arroz', 'Feijão'],
      categoryNames: ['Alimentos'],
    });

    expect(text).toContain('Loja Central');
    expect(text).toContain('Fortaleza');
    expect(text).toContain('Arroz');
    expect(text).toContain('Alimentos');
  });

  it('builds offer representation with title and discount', () => {
    const text = buildOfferRepresentation({
      title: 'Leve 2 pague 1',
      description: 'Oferta da semana',
      productNames: ['Camiseta'],
      categoryNames: ['Vestuário'],
      discountLabel: 'Desconto de 50%',
    });

    expect(text).toContain('Leve 2 pague 1');
    expect(text).toContain('Camiseta');
    expect(text).toContain('Desconto de 50%');
  });

  it('returns an empty string when there is nothing to represent', () => {
    expect(buildProductRepresentation({ name: '' })).toBe('');
  });
});
