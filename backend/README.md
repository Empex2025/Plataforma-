# Backend (Local Commerce API)

API REST da plataforma de comércio local. Responsável por
autenticação, catálogo de produtos, lojas, preços, estoque, ofertas, avaliações,
importação em massa, busca (Meilisearch), eventos e o feed de descoberta
(Discovery).

- **Runtime:** Node.js 22+ (testado com v22.16)
- **Framework:** [NestJS 12](https://nestjs.com) + TypeScript 6 (ESM, `nodenext`)
- **Banco:** PostgreSQL 17 + PostGIS
- **ORM:** [Prisma 7](https://www.prisma.io) (driver adapter `@prisma/adapter-pg`)
- **Filas / cache:** Valkey (compatível com Redis) + [BullMQ](https://docs.bullmq.io)
- **Busca:** [Meilisearch](https://www.meilisearch.com)
- **Storage:** S3 / MinIO (feature de importação CSV)
- **Docs da API:** [Scalar](https://scalar.com) em `/docs`

---

## Sumário

- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Começando](#começando)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados e Prisma](#banco-de-dados-e-prisma)
- [Scripts disponíveis](#scripts-disponíveis)
- [Documentação da API](#documentação-da-api)
- [Testes](#testes)
- [Convenções de código](#convenções-de-código)
- [Segurança](#segurança)
- [Observabilidade](#observabilidade)
- [Deploy](#deploy)
- [Solução de problemas](#solução-de-problemas)

---

## Arquitetura

O backend é um monólito modular NestJS. Cada domínio é um módulo isolado em
`src/modules/*`, com dependências explícitas via `imports`/`exports`.

```
Cliente HTTP
   │
   ▼
Controller  ──►  Service  ──►  Prisma (PostgreSQL/PostGIS)
   │                │
   │                ├──►  Queue (BullMQ/Valkey)  ──►  Processor
   │                │                                     │
   │                └──►  SearchProvider (Meilisearch)  ◄─┘  Indexers
   ▼
Guards → Pipes → Interceptors → Handler → (Exception filters)
```

**Ciclo de uma requisição:**

1. **Middleware** — `helmet`, `compression`, CORS e prefixo global `/api`.
2. **Guards** — autenticação (`JwtAuthGuard` / `OptionalJwtAuthGuard`),
   escopo de empresa (`CompanyScopeGuard`), papéis (`RolesGuard`,
   `CompanyRoleGuard`).
3. **Pipes** — `ValidationPipe` global (`whitelist`, `transform`,
   `forbidNonWhitelisted`) valida DTOs com `class-validator`.
4. **Interceptors** — `ClassSerializerInterceptor` para serialização de DTOs.
5. **Service** — regra de negócio. Efeitos colaterais (indexação, eventos) são
   enfileirados, nunca bloqueiam a resposta.
6. **Resposta** — DTOs de resposta explícitos.

**Multi-tenancy:** o `CompanyScopeGuard` resolve a empresa ativa a partir do
cabeçalho `X-Company-Id` (validando o vínculo do usuário) e injeta
`req.userCompany`. Services de escrita sempre recebem `companyId` e filtram por
ele.

**Busca:** o PostgreSQL é a fonte da verdade; o Meilisearch é um *read model*.
`ProductIndexer`/`StoreIndexer` montam os documentos e o `SearchIndexQueue`
(BullMQ) aplica indexação assíncrona. Reindexação em massa fica em
`POST /api/search/admin/reindex`.

**Discovery:** feed determinístico (`/api/discovery`) que combina produtos e
lojas com ranking ponderado (`DISCOVERY_WEIGHTS`) e motivos derivados de dados
reais. Sinais de popularidade vêm de agregações na tabela `events`.

---

## Estrutura de pastas

```
backend/
├── prisma/
│   ├── schema.prisma        # modelos, enums e índices
│   └── seed.ts              # seed idempotente (planos)
├── src/
│   ├── main.ts              # bootstrap (helmet, CORS, Scalar, prefixo /api)
│   ├── app.module.ts        # composição dos módulos
│   ├── common/              # guards, decorators, pipes, filters, helpers
│   ├── config/              # validação de env
│   ├── db/                  # PrismaService / PrismaModule
│   ├── generated/prisma/    # client gerado (gitignored)
│   └── modules/             # um diretório por domínio
├── test/                    # testes E2E (*.e2e-spec.ts) + jest-e2e.json
└── docker-compose.yml       # postgres, valkey, minio, meilisearch
```

**Layout padrão de um módulo:**

```
modules/<dominio>/
├── <dominio>.module.ts
├── <dominio>.controller.ts      # ou controllers/
├── services/                    # regra de negócio
├── dto/                         # entrada/saída validados
├── processors/                  # jobs BullMQ
├── queues/                      # produtores de fila
├── helpers/                     # funções puras
├── indexers/ · providers/ · documents/   # módulo search
├── storage/ · parsers/ · normalizers/ · validators/  # módulo imports
└── *.spec.ts                    # testes unitários
```

Módulos de domínio: `auth`, `users`, `companies`, `stores`, `products`,
`categories`, `brands`, `prices`, `inventory`, `offers`, `favorites`, `reviews`,
`contacts`, `alerts`, `plans`, `intelligence`, `events`, `search`, `imports`,
`public`, `tags`, `discovery`.

---

## Pré-requisitos

- **Node.js 22+** e npm
- **Docker** (para Postgres/PostGIS, Valkey, MinIO e Meilisearch)
- Opcional: `bun` (há `bun.lock` no repositório; o fluxo validado é com npm)

---

## Começando

### 1. Clonar e instalar

```bash
git clone https://github.com/Empex2025/Plataforma-.git
cd Plataforma-/backend
npm install
```

### 2. Subir a infraestrutura local

```bash
docker compose up -d
```

Isso sobe:

| Serviço | Porta | Uso |
|---------|-------|-----|
| PostgreSQL (PostGIS) | `5432` | banco principal |
| Valkey | `6379` | filas BullMQ |
| MinIO | `9000` / `9001` | storage S3 (importação) |
| Meilisearch | `7700` | índice de busca |

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Os valores do `.env.example` já batem com o `docker-compose.yml` para
desenvolvimento local.

### 4. Preparar o banco

```bash
npm run db:generate     # gera o client em src/generated/prisma
npm run db:migrate      # aplica as migrations versionadas (migrate deploy)
npm run db:seed         # popula os planos (idempotente)
```

> Para criar uma nova migration durante o desenvolvimento use
> `npm run db:migrate:dev`. As migrations ficam versionadas em
> `prisma/migrations` (veja [Banco de dados e Prisma](#banco-de-dados-e-prisma)).

### 5. Rodar a API

```bash
npm run start:dev
```

A API sobe em `http://localhost:3000/api` e a documentação interativa em
`http://localhost:3000/docs`.

---

## Variáveis de ambiente

Validadas na inicialização por `src/config/env.validation.ts` — a aplicação
**não sobe** com configuração inválida.

| Variável | Obrigatória | Padrão | Descrição |
|----------|:-----------:|--------|-----------|
| `DATABASE_URL` | ✅ | — | string de conexão PostgreSQL |
| `JWT_SECRET` | ✅ | — | segredo JWT (mínimo 16 caracteres) |
| `NODE_ENV` | | `development` | ambiente |
| `PORT` | | `3000` | porta HTTP |
| `JWT_EXPIRATION` | | `1d` | validade do access token |
| `VALKEY_HOST` | | `localhost` | host do Valkey/Redis |
| `VALKEY_PORT` | | `6379` | porta do Valkey/Redis |
| `MEILISEARCH_HOST` | | `http://localhost:7700` | host do Meilisearch |
| `MEILISEARCH_API_KEY` | | — | master key do Meilisearch |
| `S3_ENDPOINT` | condicional¹ | — | endpoint S3/MinIO |
| `S3_BUCKET` | | — | bucket de importação |
| `S3_ACCESS_KEY` | condicional¹ | — | credencial S3 |
| `S3_SECRET_KEY` | condicional¹ | — | credencial S3 |
| `S3_REGION` | | `us-east-1` | região S3 |

¹ Se **qualquer** variável `S3_*` estiver definida, `S3_ENDPOINT`,
`S3_ACCESS_KEY` e `S3_SECRET_KEY` passam a ser obrigatórias (necessárias apenas
para a importação CSV).

---

## Banco de dados e Prisma

O schema fica em `prisma/schema.prisma` e o client é gerado em
`src/generated/prisma` (gitignored).

```bash
npm run db:generate        # regenera o client após mudar o schema
npm run db:migrate         # aplica migrations pendentes (migrate deploy)
npm run db:migrate:dev     # cria/aplica migrations em desenvolvimento
npm run db:status          # mostra o estado das migrations
npm run db:seed            # roda prisma/seed.ts
```

### Migrations versionadas

As migrations ficam em `prisma/migrations` e são **versionadas no Git**. O banco
de um ambiente novo é reconstruído de forma reproduzível com
`prisma migrate deploy` — não há mais dependência de `prisma db push`.

O Prisma não expressa alguns objetos necessários. Eles estão declarados como SQL
dentro da migration inicial:

- extensão `postgis` (obrigatória) e `vector` (opcional, quando disponível no
  servidor);
- índice espacial `GIST` em `stores.location`;
- índice único parcial `prices_active_unique_idx`
  (`store_id, product_id, type` onde `valid_to IS NULL`), que garante um único
  preço ativo por loja/produto/tipo.

Ao criar novas migrations com `prisma migrate dev`, use `--create-only` quando
precisar editar SQL manualmente e mantenha esses objetos.

> Em ambientes já existentes, criados anteriormente com `db push`, marque a
> migration inicial como aplicada sem executá-la novamente:
> `npx prisma migrate resolve --applied 20260911143533_init`.

### PostGIS

Alguns recursos dependem de geografia:

- `Store.location` é `geography(Point, 4326)`.
- Há um índice espacial `GIST` em `stores.location` (criado na migration, pois o
  Prisma não o expressa no schema).
- Consultas de proximidade usam `ST_DWithin` / `ST_Distance`.

Use a imagem `postgis/postgis` (já configurada no `docker-compose.yml`).

### pgvector (opcional)

O caminho de busca vetorial usa a extensão `vector` quando ela está disponível
(`EMBEDDING_VECTOR_STORE=pgvector`); caso contrário, o `ArrayVectorStore` é usado
como fallback. A migration inicial habilita a extensão apenas se o servidor
oferecê-la (`pg_available_extensions`). Para usá-la, aponte o Postgres para uma
imagem que inclua PostGIS + pgvector.

---

## Scripts disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `npm run start` | `nest start` | sobe a API |
| `npm run start:dev` | `nodemon` | watch de `src/`, rebuild + restart |
| `npm run start:debug` | `nest start --debug --watch` | debug com watch |
| `npm run start:prod` | `node dist/main` | executa o build |
| `npm run build` | `nest build` | compila para `dist/` |
| `npm run postbuild` | `tsc-alias` | reescreve os aliases `@/` no build |
| `npm run lint` | `oxlint src/ test/` | lint (rápido) |
| `npm run format` | `prettier --write` | formatação |
| `npm test` | Jest | testes unitários |
| `npm run test:watch` | `jest --watch` | unitários em watch |
| `npm run test:cov` | `jest --coverage` | cobertura |
| `npm run test:e2e` | Jest + `test/jest-e2e.json` | testes de integração |

> O `start:dev` usa `nodemon` + `tsc-alias` porque o runtime é ESM com aliases.
> O build precisa acontecer para que `@/` seja resolvido em `dist/`.

---

## Documentação da API

- **Scalar UI:** `http://localhost:3000/docs`
- **Prefixo global:** `/api`
- **Auth:** Bearer JWT (`Authorization: Bearer <token>`)
- **Escopo de empresa:** cabeçalho `X-Company-Id` nas rotas autenticadas por
  empresa.

Endpoints públicos de destaque:

```
GET  /api/discovery              # feed de descoberta
GET  /api/discovery/offers       # ofertas ativas
GET  /api/discovery/new          # novidades
GET  /api/discovery/trending     # itens em alta
GET  /api/discovery/nearby       # lojas próximas (lat/lng)
GET  /api/search/products        # busca de produtos
GET  /api/search/stores          # busca de lojas
GET  /api/search/autocomplete    # autocomplete
GET  /api/tags                   # tags de atributos
```

---

## Testes

### Unitários

```bash
npm test
```

- Jest 30 + `@swc/jest`, config em `jest.config.ts`.
- Colocados junto ao código (`*.spec.ts`).
- Não exigem infraestrutura externa (Prisma e serviços são mockados).

### E2E

```bash
npm run test:e2e
```

- Config em `test/jest-e2e.json`, arquivos `*.e2e-spec.ts`.
- Sobe o `AppModule` real com `supertest` — **exige** Postgres, Valkey e
  Meilisearch no ar (`docker compose up -d`).
- Usa dados únicos por execução e faz limpeza no `afterAll`.

> Dica: em máquinas com pouca memória, rode `npm test -- --runInBand` para
> evitar OOM dos workers do Jest.

---

## Convenções de código

- **ESM:** `module`/`moduleResolution` = `nodenext`. Imports relativos usam a
  extensão `.js` (ex.: `import { X } from './x.service.js'`).
- **Alias:** `@/*` → `src/*`. Resolvido por:
  - `tsc-alias` no build,
  - `tsconfig-paths/register` no dev,
  - `moduleNameMapper` no Jest.
- **Camadas:** Controller → Service → Prisma. Controller não acessa banco
  diretamente; Service não conhece HTTP.
- **DTOs:** entrada validada com `class-validator`; saída com DTOs explícitos
  (`fromPlain`) e `ClassSerializerInterceptor`.
- **Constantes:** pesos, thresholds e limites ficam em arquivos
  `*.constants.ts` (sem números mágicos).
- **Efeitos assíncronos:** indexação e tracking de eventos são enfileirados e
  falham de forma silenciosa (não quebram a resposta).
- **Testes:** toda regra nova deve vir com unitário; fluxos críticos com E2E.

---

## Segurança

- `helmet` para cabeçalhos HTTP.
- CORS habilitado.
- `ValidationPipe` global com `whitelist` + `forbidNonWhitelisted`.
- Autenticação JWT via Passport; `JwtAuthGuard` e `OptionalJwtAuthGuard`.
- Autorização por papel (`RolesGuard`, `CompanyRoleGuard`) e por empresa
  (`CompanyScopeGuard` + `X-Company-Id`).
- Senhas com `bcryptjs`.
- Segredos apenas via variáveis de ambiente (`.env` é gitignored).

---

## Observabilidade

- `@nestjs/observe` para tracing/métricas quando configurado.
- Logs estruturados do Nest (`Logger`) por módulo.
- Swagger/Scalar gerado a partir dos decorators.

---

## Deploy

```bash
npm ci                 # instala dependências (inclui a CLI do Prisma)
npm run db:generate    # gera o client
npm run db:migrate     # aplica migrations pendentes (prisma migrate deploy)
npm run build          # gera dist/ (com aliases resolvidos)
npm run start:prod     # node dist/main
```

- Aplique as migrations como passo de release, **antes** de subir a nova versão
  da API. Não use `prisma db push` em produção.
- Variáveis de ambiente devem ser injetadas pelo ambiente de execução.
- A infraestrutura (Postgres, Valkey, Meilisearch, S3) precisa estar acessível.
- Existe `npm run deploy` (`nest deploy` / Mau) para plataformas suportadas.

---

## Solução de problemas

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| `P1001: Can't reach database server` | Postgres fora do ar | `docker compose up -d postgres` |
| API não sobe e loga `Invalid environment configuration` | `.env` faltando/inválido | copie `.env.example` e ajuste |
| Busca vazia | Meilisearch sem índice | `POST /api/search/admin/reindex` (admin) |
| Worker não processa filas | Valkey fora do ar | `docker compose up -d valkey` |
| `Cannot find module '@/...'` no runtime | build sem `postbuild` | rode `npm run build` (inclui `tsc-alias`) |
| Jest worker OOM | execução paralela pesada | `npm test -- --runInBand` |

---

## Licença

Projeto privado (`UNLICENSED`). Todos os direitos reservados à EncontraÊ.
