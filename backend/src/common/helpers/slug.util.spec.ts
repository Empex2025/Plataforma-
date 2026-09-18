import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import {
  buildSlugLookupWhere,
  normalizeSlug,
  resolveUniqueSlug,
  type SlugCandidate,
} from './slug.util.js';

describe('slug.util', () => {
  describe('normalizeSlug', () => {
    it('should lowercase, strip accents and collapse separators', () => {
      expect(normalizeSlug('  Minha Empresa  ')).toBe('minha-empresa');
      expect(normalizeSlug('Decoração & Cia')).toBe('decoracao-cia');
      expect(normalizeSlug('A--B')).toBe('a-b');
    });

    it('should return empty string when nothing usable remains', () => {
      expect(normalizeSlug('!!!')).toBe('');
    });
  });

  describe('buildSlugLookupWhere', () => {
    it('should build a single OR query for the base and its suffixed variants', () => {
      expect(buildSlugLookupWhere('marca')).toEqual({
        OR: [{ slug: 'marca' }, { slug: { startsWith: 'marca-' } }],
      });
    });
  });

  describe('resolveUniqueSlug', () => {
    it('should return the base slug when free', async () => {
      const findExisting = jest.fn<() => Promise<SlugCandidate[]>>().mockResolvedValue([]);

      const slug = await resolveUniqueSlug({
        name: 'Minha Empresa',
        findExisting,
      });

      expect(slug).toBe('minha-empresa');
      expect(findExisting).toHaveBeenCalledTimes(1);
      expect(findExisting).toHaveBeenCalledWith('minha-empresa');
    });

    it('should pick the next free suffix in memory using a single lookup', async () => {
      const findExisting = jest.fn<() => Promise<SlugCandidate[]>>().mockResolvedValue([
        { id: '1', slug: 'minha-empresa' },
        { id: '2', slug: 'minha-empresa-2' },
        { id: '3', slug: 'minha-empresa-3' },
      ]);

      const slug = await resolveUniqueSlug({
        name: 'Minha Empresa',
        findExisting,
      });

      expect(slug).toBe('minha-empresa-4');
      expect(findExisting).toHaveBeenCalledTimes(1);
    });

    it('should throw when an explicitly provided slug is taken', async () => {
      const findExisting = jest
        .fn<() => Promise<SlugCandidate[]>>()
        .mockResolvedValue([{ id: 'other', slug: 'taken' }]);

      await expect(
        resolveUniqueSlug({ providedSlug: 'taken', name: 'X', findExisting }),
      ).rejects.toThrow(ConflictException);
    });

    it('should ignore the excluded entity when resolving (idempotent update)', async () => {
      const findExisting = jest
        .fn<() => Promise<SlugCandidate[]>>()
        .mockResolvedValue([{ id: 'self', slug: 'minha-empresa' }]);

      const slug = await resolveUniqueSlug({
        name: 'Minha Empresa',
        excludeId: 'self',
        findExisting,
      });

      expect(slug).toBe('minha-empresa');
    });

    it('should throw when no usable base slug can be generated', async () => {
      const findExisting = jest.fn<() => Promise<SlugCandidate[]>>().mockResolvedValue([]);

      await expect(
        resolveUniqueSlug({ name: '!!!', findExisting }),
      ).rejects.toThrow(ConflictException);
      expect(findExisting).not.toHaveBeenCalled();
    });
  });
});
