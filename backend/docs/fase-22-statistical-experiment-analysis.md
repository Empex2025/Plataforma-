# Fase 22 — Statistical Experiment Analysis

## 1. Objetivo

Adicionar análise estatística aos resultados dos experimentos da Fase 21, para
responder: "existe evidência suficiente de que a diferença observada entre as
variantes não seja apenas ruído amostral?".

A fase apresenta **efeito observado + incerteza + tamanho de amostra +
significância**, sem declarar vencedor. A decisão de produto permanece humana.

Princípio: **observed difference ≠ proven improvement**.

## 2. Métricas

Três proporções binárias, todas com denominador = `impressions`:

| Métrica | Numerador (successes) | Denominador (sample size) |
|---------|-----------------------|---------------------------|
| CTR | `RECOMMENDATION_CLICK` | `RECOMMENDATION_IMPRESSION` |
| FAVORITE_RATE | `PRODUCT_FAVORITE` + `STORE_FAVORITE` | `RECOMMENDATION_IMPRESSION` |
| CONTACT_RATE | `WHATSAPP_CLICK` + `PHONE_CLICK` | `RECOMMENDATION_IMPRESSION` |

Denominador 0 → taxa/IC/`pValue` = `null` (nunca NaN/Infinity).

## 3. Sample size

Para cada métrica, `sampleSize` = número de **impressions** (não confundir com o
`sampleSize` de assignments de nível de experimento, que continua existindo em
`variants[].sampleSize`). `successes` = numerador da métrica.

## 4. Minimum sample

`EXPERIMENT_STATISTICS_CONFIG.minSampleSize` (default **100**, configurável por
env). Se qualquer variante tiver `sampleSize < minSampleSize`, o status é
`INSUFFICIENT_SAMPLE` e `significant = false`. Os dados observados continuam
sendo retornados (não escondemos nada).

## 5. Confidence interval

Wilson score interval para uma proporção, por métrica e por variante:

```
center = (p + z²/2n) / (1 + z²/n)
margin = (z / (1 + z²/n)) · sqrt( p(1-p)/n + z²/(4n²) )
[lower, upper] = center ∓ margin   (limitado a [0,1])
```

`p = successes/n`, `z = zScoreForConfidence(confidenceLevel)`.

## 6. Wilson method

Escolhido em vez da aproximação normal (Wald) por se comportar corretamente com
amostras pequenas e proporções próximas de 0/1. Quando `n = 0`, retorna `null`.
`z` vem de `inverseNormalCdf((1 + confidenceLevel)/2)` (Acklam, erro relativo
~1e-9); `erf` usa a aproximação Abramowitz & Stegun 7.1.26 (erro ~1.5e-7).

## 7. Two-proportion test

Teste z de duas proporções com proporção agrupada (H0: p1 = p2; H1: p1 ≠ p2):

```
pooled = (s1 + s2) / (n1 + n2)
se     = sqrt( pooled(1-pooled)(1/n1 + 1/n2) )
z      = (p2 - p1) / se          # p2 = treatment, p1 = control
pValue = 2 · (1 - Φ(|z|))
```

Retorna `null` quando o teste não é utilizável: totais ≤ 0 ou `pooled` em {0,1}
(variância nula).

## 8. P-value

Numérico, limitado a `[0, 1]`, `null` quando não computável. **Não** é prova de
causalidade: é evidência contra H0 sob as premissas do teste.

## 9. Alpha

`EXPERIMENT_STATISTICS_CONFIG.alpha` (default **0.05**, env
`STATISTICS_ALPHA`, validado em `(0, 1)`). `significant = pValue < alpha` **e**
amostra suficiente **e** pValue não nulo.

## 10. Confidence level

`EXPERIMENT_STATISTICS_CONFIG.confidenceLevel` (default **0.95**, env
`STATISTICS_CONFIDENCE_LEVEL`, validado em `(0, 1)`). Retornado em cada
comparação.

## 11. Relative lift

```
absoluteDifference = (treatmentRate - controlRate) · 100   # pontos percentuais
relativeLift       = (treatmentRate - controlRate) / controlRate   # fração
```

Se `controlRate = 0` → `relativeLift = null`. Nunca Infinity/NaN. Cuidado com
"1 ponto percentual" × "1 por cento": taxas/IC/diferença absoluta são
**percentuais (0..100)**; `relativeLift` é **fração** (0.2 = +20%).

## 12. Statistical status

- `INSUFFICIENT_SAMPLE` — amostra abaixo do mínimo.
- `NOT_SIGNIFICANT` — amostra suficiente e `pValue ≥ alpha` (ou pValue `null`).
- `SIGNIFICANT` — amostra suficiente e `pValue < alpha`.

Nunca há `WINNER`/`BEST_VARIANT`/`RECOMMENDED_VARIANT`.

## 13. Multi-variant limitation

Análise completa (comparação) só para o par **CONTROL vs TREATMENT** (control =
key `CONTROL` ou primeira variante; treatment = key `TREATMENT` ou primeira
diferente). Mais de duas variantes: `statisticalAnalysis.variants[]` traz
estatísticas individuais (rate + IC) de todas; `comparisons[]` cobre apenas o
par. Não inventamos um teste único para N variantes.

## 14. Multiple comparisons limitation

Sem correção automática de múltiplas comparações. Comparações pairwise entre
muitas variantes aumentam o risco de falso-positivo. Nenhuma significância
"global" é declarada. Correções (Bonferroni/BH) ficam como trabalho futuro.

## 15. Time window

```
from = max(period.start, experiment.startAt)
end   = experiment.endAt ? min(period.end, experiment.endAt) : period.end
```

Eventos fora de `[startAt, endAt]` nunca são contados. Experimento RUNNING usa
`now` como limite superior (via `resolvePeriod`). Sample integrity garantida por
`experimentId` + assignment (Fase 21).

## 16. Privacy

Resultados continuam **agregados**. Nunca retornamos `userId`, `subjectId`,
assignment individual ou eventos individuais.

## 17. Security

`GET /api/experiments/:id/results` mantém `JwtAuthGuard` + `RolesGuard`
(`ADMIN`/`SUPER_ADMIN`). Usuários comuns recebem 403.

## 18. Performance

A estatística opera sobre os **agregados** já calculados pela Fase 21 (uma query
agregada). Nenhum acesso a eventos individuais, nenhum N+1, sem recálculo do
experimento. O serviço é puro/determinístico sobre contadores.

## 19. Tests

**Unit** (helpers + service + config/env): `safeRatio`, `relativeLift`, Wilson
(0/100, 100/100, n=0, narrowing), `erf`/`normalCdf`/`inverseNormalCdf`/
`zScoreForConfidence`, z-test (iguais→p≈1; grande→p<0.05; pequena→não
significante; variância 0→null), config provider (defaults/valores/inválidos),
`ExperimentStatisticsService` (percentuais, SIGNIFICANT/NOT_SIGNIFICANT/
INSUFFICIENT_SAMPLE, denominador 0 → nulls, controle 0 → lift null, 1 variante →
sem comparação, 3 variantes → individuais + par, ausência de valores
não-finitos), env validation.

**E2E** (`test/experiments.e2e-spec.ts`): resultados continuam funcionando;
`statisticalAnalysis` presente com 3 métricas; `INSUFFICIENT_SAMPLE`;
`NOT_SIGNIFICANT`; `SIGNIFICANT` (assignment + eventos semeados por `sessionId`);
IC/`pValue`/`lift`; janela (eventos antes de `startAt` e depois de `endAt`
excluídos); privacidade; 403/200.

## 20. Gates

| Gate | Resultado |
|------|-----------|
| `npm run lint` | 0 problemas |
| `npm run build` | OK |
| `npm test` | 78 suites, 687 testes, 0 falhas |
| `npm run test:e2e` | 21 suites, 293 testes, 0 falhas |

Baseline anterior: 72 suites / 645 unit; 21 suites / 289 e2e.

## 21. Limitations

- Apenas métricas binárias/proporcionais (CTR, Favorite Rate, Contact Rate).
- Comparação estatística completa limitada a CONTROL vs TREATMENT.
- Sem correção de múltiplas comparações.
- Sem significância para métricas contínuas/não-binárias.
- Aproximações numéricas (erf/z) com erro desprezível para p-values.

## 22. Technical debt

- Correção de múltiplas comparações (Bonferroni/BH) para >2 variantes.
- Suporte a métricas contínuas (ex.: receita) exigiria outro teste (t-test).
- Faixa de sensibilidade / power analysis e tamanho mínimo de amostra por efeito
  esperado não implementados.
