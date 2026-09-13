# Fase 4 — Confiança + Conversão

## Resumo

Auditoria completa dos módulos públicos, reviews, contatos, discovery, inventário/preços/ofertas. Implementação de correções de bugs e sinais de confiança.

## Resultados dos Gates

| Gate | Resultado |
|------|-----------|
| Lint (oxlint) | ✅ 0 erros |
| Build (nest build + tsc-alias) | ✅ Compilação limpa |
| Unit tests (jest) | ✅ 390/390 |
| E2E tests (jest) | ✅ 197/197 |

## Correções Implementadas

### Fix 1 — Reviews públicas não expõem `userId`

**Problema:** `GET /reviews/public/:targetType/:targetId` retornava `userId` no response, permitindo identificar o autor da review.

**Solução:** Criado `PublicReviewResponseDto` (sem `userId`, sem `status`) para o endpoint público. O endpoint interno mantém `ReviewResponseDto` completo.

**Arquivos:**
- `src/modules/reviews/dto/review-response.dto.ts` — novo `PublicReviewResponseDto`
- `src/modules/reviews/services/reviews.service.ts` — `findByTarget()` retorna DTO público
- `src/modules/reviews/reviews.controller.ts` — endpoint público usa novo DTO

### Fix 2 — Contatos `EMAIL` não geram eventos incorretos

**Problema:** `ContactsService.mapContactTypeToEvent()` mapeava `EMAIL` para `WHATSAPP_CLICK` (default), gerando eventos de clique incorretos.

**Solução:** Para `EMAIL`, o método retorna `null` e o tracking de evento é pulado. Não existe `EMAIL_CLICK` no enum `EventType` e não justifica alteração de schema.

**Arquivo:** `src/modules/contacts/services/contacts.service.ts`

### Fix 3 — Preços futuros não aparecem como preço atual

**Problema:** Queries SQL buscavam preços com `valid_to IS NULL` mas não verificavam `valid_from <= NOW()`. Um preço futuro (com `valid_from` no futuro e `valid_to = NULL`) aparecia como preço atual.

**Solução:** Adicionado `AND (p.valid_from IS NULL OR p.valid_from <= NOW())` em todas as subqueries de preço:
- `src/modules/public/helpers/public-availability.ts` — query principal de disponibilidade
- `src/modules/public/services/public-stores.service.ts` — query de produtos da loja, contagens e categorias

### Fix 4 — `ratingCount` exposto no Discovery

**Problema:** `DiscoveryHitDto` tinha `ratingAverage` mas não `ratingCount`, impossibilitando distinguir lojas/produtos com poucas vs muitas avaliações.

**Solução:**
- `src/modules/discovery/dto/discovery-response.dto.ts` — adicionado `ratingCount?: number | null`
- `src/modules/discovery/services/discovery.service.ts` — popular `ratingCount` em `discoverProducts()`, `discoverStores()` e `getNearby()`

### Fix 5 — `priceUpdatedAt` exposto na disponibilidade

**Problema:** Consumidor não sabia se o preço era de hoje ou de meses atrás. Ausência de sinal de "frescor".

**Solução:**
- `src/modules/public/dto/public-product-response.dto.ts` — adicionado `priceUpdatedAt?: Date | null` ao `PublicStoreAvailabilityDto`
- `src/modules/public/dto/public-store-product-response.dto.ts` — adicionado `priceUpdatedAt` ao `PublicStoreProductResponseDto`
- `src/modules/public/helpers/public-availability.ts` — query SQL retorna `price_updated_at`
- `src/modules/public/services/public-stores.service.ts` — query SQL retorna `price_updated_at`

### Fix 6 — Listagem de contatos da loja não expõem `userId`

**Problema:** `GET /contacts/store/:storeId` retornava `userId` no response, permitindo identificar quem contatou a loja.

**Solução:** Criado `PublicContactResponseDto` (sem `userId`) para o endpoint de contatos da loja.

**Arquivos:**
- `src/modules/contacts/dto/contact-response.dto.ts` — novo `PublicContactResponseDto`
- `src/modules/contacts/services/contacts.service.ts` — `findByStore()` retorna DTO público
- `src/modules/contacts/contacts.controller.ts` — endpoint usa novo DTO

## Trust Signals DTO

### Estrutura

```typescript
// src/modules/public/dto/trust-signals.dto.ts
class TrustSignalsDto {
  bemAvaliado: boolean;        // rating >= 4.0
  precoAtualizado: boolean;    // updatedAt <= 7 dias
  estoqueInformado: boolean;   // sempre true (dado existe)
  ofertaAtiva: boolean;        // loja tem oferta ativa
  avaliacoesSuficientes: boolean; // ratingCount >= 3
  informacaoRecente: boolean;  // createdAt <= 30 dias
}
```

### Integração

- `PublicProductResponseDto.trustSignals` — sinalizado em `PublicProductsService.findBySlug()`
- `PublicStoreResponseDto.trustSignals` — sinalizado em `PublicStoresService.findBySlug()`

### Helper

```typescript
// src/modules/public/helpers/trust-signals.ts
computeTrustSignals(input: TrustSignalsInput): TrustSignalsDto
```

## Limitações Documentadas

1. **Contatos EMAIL não geram eventos** — não existe `EMAIL_CLICK` no enum `EventType`. O evento de contato para EMAIL não é rastreado. Se necessário no futuro, adicionar `EMAIL_CLICK` ao schema Prisma.

2. **Preços futuros filtrados na query** — a correção `valid_from <= NOW()` significa que preços agendados (com `valid_from` futuro) não aparecem nos endpoints públicos. Isso é o comportamento correto.

3. **Trust Signals são determinísticos** — baseados em thresholds fixos (4.0 rating, 7 dias frescor, 3 avaliações, 30 dias recente). Não são ML ou scoring dinâmico.

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/modules/reviews/dto/review-response.dto.ts` | +PublicReviewResponseDto |
| `src/modules/reviews/services/reviews.service.ts` | findByTarget() retorna DTO público |
| `src/modules/reviews/reviews.controller.ts` | endpoint público usa novo DTO |
| `src/modules/contacts/dto/contact-response.dto.ts` | +PublicContactResponseDto |
| `src/modules/contacts/services/contacts.service.ts` | findByStore() retorna DTO público; EMAIL sem tracking |
| `src/modules/contacts/contacts.controller.ts` | endpoint store contacts usa novo DTO |
| `src/modules/discovery/dto/discovery-response.dto.ts` | +ratingCount |
| `src/modules/discovery/services/discovery.service.ts` | popular ratingCount em 3 métodos |
| `src/modules/public/dto/public-product-response.dto.ts` | +priceUpdatedAt, +trustSignals |
| `src/modules/public/dto/public-store-response.dto.ts` | +trustSignals |
| `src/modules/public/dto/public-store-product-response.dto.ts` | +priceUpdatedAt |
| `src/modules/public/helpers/public-availability.ts` | valid_from <= NOW(), price_updated_at |
| `src/modules/public/helpers/public-resolver.ts` | +createdAt no PublicStoreRecord |
| `src/modules/public/helpers/trust-signals.ts` | **NOVO** — helper de trust signals |
| `src/modules/public/dto/trust-signals.dto.ts` | **NOVO** — DTO de trust signals |
| `src/modules/public/services/public-products.service.ts` | integra trust signals |
| `src/modules/public/services/public-stores.service.ts` | integra trust signals; valid_from <= NOW() |
| `test/reviews.e2e-spec.ts` | ajuste para PublicReviewResponseDto |
