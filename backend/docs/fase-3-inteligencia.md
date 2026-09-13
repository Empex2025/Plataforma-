# Fase 3 — Inteligência: Dívida Técnica e Limitações

## Dívida Técnica

1. **Produtos mais contatados (não implementado):** `WHATSAPP_CLICK`/`PHONE_CLICK` são atribuídos ao store (`targetType='store'`), não ao product. A tabela `Contact` não possui `productId`. "Produtos mais contatados" requer schema change + producer change, ficou fora do escopo.

2. **Regiões limitadas a lojas:** Métricas de região baseiam-se em `store.city/state` (eventos atribuíveis a loja). Eventos de produto não carregam cidade confiável. Região de eventos sem loja associada é perdida.

3. **Sem cache Redis:** Agregações pesadas (top buscas, top empresas) rodam SQL direto no Postgres. Se volume ficar hot path, considerar TTL cache (5-10min).

4. **Discovery não consumiu signals:** `IntelligenceSignalsService` foi criada com testes, mas `TrendingService` continua com sua própria agregação. Rewiring pode ser feito em fase futura.

5. **Eventos sem producer:** `MAP_OPEN`, `ROUTE_REQUESTED`, `AVAILABILITY_CHECK`, `FILTER_USED`, `PRODUCT_SHARED` existem no enum mas não têm produtores. Métricas baseadas nesses eventos seriam sempre zero.

## Limitações

- **Demand Gap G1/G3 são sinais heurísticos**, não medição definitiva de demanda. API e documentação deixam isso explícito via `heuristicDisclaimer`.
- **Eventos anônimos** (`userId: null`) são contados normalmente.
- **Range máximo de 90 dias** para séries temporais (clamped automaticamente).
- **Target não resolvível:** eventos com `targetId` cuja entidade foi deletada são excluídos da empresa, mas contam na plataforma.
- **Attribution:** empresa é resolvida apenas via `targetType+targetId → entidade → companyId`. Nunca via `metadata`.

## Fórmulas e Regras

### Demand Gap G1 (Buscas sem resultado)
```
G1 = sum(count do SEARCH com metadata.resultCount = 0, agrupado por query)
```
Sinal heurístico: buscas que retornaram zero resultados indicam possível oportunidade de expansão de catálogo.

### Demand Gap G3 (Demanda por categoria)
```
G3 = sum(demand - supply para categorias que atendem thresholds)
  onde:
    demand = count(PRODUCT_VIEW por categoria)
    supply = count(produtos ativos na categoria)
    thresholds: minDemand = 5, maxSupply = 3
```
Sinal heurístico: categorias com muitas visualizações e poucos produtos indicam possível oportunidade.

### Contact Funnel
```
conversionRate = (WHATSAPP_CLICK + PHONE_CLICK) / STORE_VIEW * 100
```
Atribuído ao store (não ao produto).

### Engagement
- productViews: PRODUCT_VIEW (target_type=product)
- storeViews: STORE_VIEW (target_type=store)
- productFavorites: PRODUCT_FAVORITE
- storeFavorites: STORE_FAVORITE
- contacts: WHATSAPP_CLICK + PHONE_CLICK (target_type=store)
- reviewsCreated: REVIEW_CREATED
- reviewsApproved: REVIEW_APPROVED

## Endpoints

### Company
- `GET /intelligence/company/:companyId` — engagement + contactFunnel
- `GET /intelligence/company/:companyId/demand-gap` — G1 + G3
- `GET /intelligence/company/:companyId/timeseries` — série temporal diária/semanal

### Platform (ADMIN/SUPER_ADMIN)
- `GET /intelligence/platform` — top produtos/lojas/buscas/empresas/categorias + totals
- `GET /intelligence/platform/demand-gap` — G1 + G3
- `GET /intelligence/platform/timeseries` — série temporal
- `GET /intelligence/platform/regions` — top regiões por city/state

### Query params
- `startDate/endDate` — ISO 8601
- `metrics` — comma-separated: views,favorites,contacts,reviews
- `granularity` — day ou week (default: day)
