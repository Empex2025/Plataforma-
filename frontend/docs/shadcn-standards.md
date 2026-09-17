# shadcn/ui + Nexus Design System — Padrão de Arquitetura

Documento de referência para uso de shadcn/ui e do design system (Nexus) no
frontend. Base: `style: base-nova`, primitivo **Base UI** (`@base-ui/react`),
Tailwind **v4**, ícones **lucide**, RSC habilitado (`rsc: true`).

Tema e tokens vivem em **`app/globals.css`** (nunca criar outro arquivo CSS de
tema). Componentes shadcn são gerados via CLI em `components/ui`.

## 1. Estrutura de pastas

```
app/
  globals.css                # tokens do design system (@theme inline) + base
  (private)/                 # rota privada (painel)
    layout.tsx               # SidebarProvider + Header + SidebarInset
    _components/             # componentes LOCAIS da rota/grupo
      header/
      sidebar/
    dashboard/
      page.tsx
      _data.ts               # dados/mocks tipados da feature
      _components/           # componentes LOCAIS do dashboard
components/
  ui/                        # primitivas shadcn (geradas pela CLI)
  providers.tsx, theme-provider.tsx, mode-toggle.tsx
hooks/                       # hooks compartilhados (ex.: use-mobile)
lib/                         # utils (cn), clientes, helpers
docs/                        # documentação (este arquivo)
```

Regras de localização:

- **`components/ui`** = primitivas shadcn. Não criar `div` estilizado para algo
  que já existe ali. Não reescrever a primitiva à mão; estenda (ver §4) ou
  componha um wrapper.
- **Componentes de feature** ficam **colocados na rota** em `_components`
  (`app/**/_components`), com dados em `_data.ts` quando forem mocks/tipos.
- **Compartilhado entre features** só vai para `components/` (fora de `ui/`)
  quando houver reuso real.
- Prefixo `_` (ex.: `_components`, `_data`) mantém a pasta **fora das rotas**.

## 2. Design System — tokens

Todos os tokens estão em `app/globals.css`:

- Valores brutos em `:root` (light) e `.dark`.
- Mapeamento para utilitários Tailwind v4 em `@theme inline` (`--color-*`,
  `--radius-*`).

### 2.1 Cores de marca (escalas 50–900)

Disponíveis como utilitários: `bg-primary-500`, `text-secondary-600`, etc.

| Escala | 50 | 100 | 200 | 300 | 400 | 500 (base) | 600 | 700 | 800 | 900 |
|--------|----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| Primary (Dark Navy) | #E6E9F0 | #B3BBCF | #808DAF | #4D5F8F | #26397F | **#00154F** | #001247 | #000F3B | #000B2F | #000823 |
| Secondary (Golden Amber) | #FEF5E2 | #FDE6B1 | #FCD780 | #FAC84F | #F7BB35 | **#F4AF1B** | #E09A0F | #C48008 | #A86704 | #8C4F02 |
| Tertiary (Warm Peach) | #FDF3EC | #FADECB | #F7C9AA | #F4B489 | #F2BC94 | **#E8A474** | #D08B5A | #B87342 | #9F5C2E | #7A4320 |
| Neutral (Grayscale) | #FFFFFF | #F8F9FA | #E9ECEF | #DEE2E6 | #CED4DA | #ADB5BD | #6C757D | #495057 | #343A40 | #212529 |

### 2.2 Tokens semânticos (shadcn)

Use **sempre** os tokens semânticos; nunca cores cruas (`bg-blue-500`,
`text-emerald-600`, hex inline).

| Token | Utilitário | Light | Dark |
|-------|-----------|-------|------|
| `--background` / `--foreground` | `bg-background` / `text-foreground` | #F8F9FA / #212529 | #0A0A0A / #FAFAFA |
| `--card` / `--card-foreground` | `bg-card` / `text-card-foreground` | #FFFFFF / #212529 | #171717 / #FAFAFA |
| `--primary` / `--primary-foreground` | `bg-primary` / `text-primary-foreground` | #00154F / #FFFFFF | #E5E5E5 / #171717 |
| `--secondary` / `--secondary-foreground` | `bg-secondary` / `text-secondary-foreground` | #F4AF1B / #00154F | #262626 / #FAFAFA |
| `--muted` / `--muted-foreground` | `bg-muted` / `text-muted-foreground` | #F8F9FA / #6C757D | #262626 / #A1A1A1 |
| `--accent` / `--accent-foreground` | `bg-accent` / `text-accent-foreground` | #FEF5E2 / #00154F | #262626 / #FAFAFA |
| `--destructive` | `bg-destructive` / `text-destructive` | #DC3545 | #FF6467 |
| `--success` / `--success-foreground` | `bg-success` / `text-success` | #198754 / #FFFFFF | #20C997 / #022C22 |
| `--warning` / `--warning-foreground` | `bg-warning` / `text-warning` | #FFC107 / #7A4A00 | #FFC107 / #FDE68A |
| `--info` / `--info-foreground` | `bg-info` / `text-info` | #0DCAF0 / #055160 | #0DCAF0 / #083344 |
| `--border` / `--input` / `--ring` | `border-border` / `border-input` / `ring-ring` | #DEE2E6 / #CED4DA / #4D5F8F | #FFFFFF1A / #FFFFFF26 / #737373 |
| `--chart-1..5` | `text-chart-1`, gráficos | navy/amber | azul/verde/âmbar/roxo/rosa |
| `--sidebar-*` | sidebar | — | — |

Cores semânticas de feedback (DS): Sucesso `#198754`, Aviso `#FFC107`, Erro
`#DC3545`, Informação `#0DCAF0`.

### 2.3 Tipografia (Inter)

Definida em `app/globals.css` (`@layer base`). Fonte via `next/font` no root
layout (`--font-sans` Inter, `--font-heading` Poppins).

| Estilo | Tamanho / Altura | Peso |
|--------|------------------|------|
| Display | 48px / 56px | 700 |
| h1 | 40px / 48px | 700 |
| h2 | 32px / 40px | 700 |
| h3 | 24px / 32px | 700 |
| h4 | 20px / 28px | 700 |
| h5 | 18px / 24px | 700 |
| Body Large | 18px | 400/500/700 |
| Body | 16px | 400/500/700 |
| Body Small | 14px | 400/500/700 |
| Label | 12px | 400/500/700 |
| Caption | 10px | 400/500/700 |

### 2.4 Raios de borda

O DS define: `xs 4px`, `sm 8px` (botões/inputs), `md 16px` (cards/modais),
`full 99px` (tags/badges/avatares). O mapeamento é feito em `@theme inline`
(não use `calc(var(--radius) *)`; usamos valores explícitos):

| Variável | Valor | Classes que usam | Uso DS |
|----------|-------|------------------|--------|
| `--radius-xs` / `--radius-sm` | 4px | `rounded-xs`, `rounded-sm` | checkbox/inputs pequenos |
| `--radius-md` / `--radius-lg` | 8px | `rounded-md`, `rounded-lg` (Button/Input) | botões, inputs, cards pequenos |
| `--radius-xl` / `--radius-2xl` | 16px | `rounded-xl` (Card), `rounded-2xl` | cards, modais, contêineres |
| `--radius-4xl` | 9999px | `rounded-4xl` (Badge) | tags, badges, avatares |

### 2.5 Espaçamento e sombras

- Espaçamento: múltiplos de 4px (padrão Tailwind). Use `gap-*` (nunca
  `space-x-*`/`space-y-*`).
- Sombras: `--shadow-2xs..2xl` (nuances de navy). Níveis DS: Level 0 (flat),
  1 (`shadow-sm`), 2 (`shadow-md`), 3 (`shadow-lg`/`xl`).

## 3. Regras de componentes

Ordem de preferência ao customizar (documentação shadcn):

1. **Variantes embutidas** — `<Button variant="outline" size="sm">`.
2. **`className`** para layout/espaçamento (não para cor/tipografia).
3. **Nova variante** via `cva` no componente em `components/ui`.
4. **Wrapper** componho primitivas em componente de feature.

Regras obrigatórias:

- **Nunca cor crua.** Sempre token semântico (`bg-success`, `text-warning`).
- **Sem `dark:` manual** para cor — os tokens já tratam light/dark.
- **`gap-*`**, não `space-*`. **`size-*`** quando largura=altura.
- **Ícones** (lucide): em `Button`, use `data-icon="inline-start|inline-end"`;
  não aplique `size-*` dentro de componentes (eles dimensionam via CSS).
- **Base UI** (não Radix): use a prop **`render`** para trocar o elemento —
  ex.: `render={<Link href="/x" />}`. **Não** existe `asChild`.
- **Composição**: itens dentro de seu grupo (`SelectItem` → `SelectGroup`).
  `Dialog`/`Sheet`/`Drawer` sempre com título.
- **Gráficos**: use o componente `chart` (`ChartContainer`, `ChartTooltip`,
  `ChartConfig`) com Recharts; cores via `var(--color-<key>)`/`var(--chart-*)`.

## 4. Adicionando/atualizando componentes

Sempre pela CLI (nunca copiar de GitHub manualmente):

```bash
npx shadcn@latest add <componente>            # ex.: add chart progress sidebar
npx shadcn@latest add <componente> --dry-run  # pré-visualizar
npx shadcn@latest add <componente> --diff <arquivo>  # diff de arquivo existente
npx shadcn@latest info --json                 # contexto do projeto (aliases, base)
```

Preservar `style: base-nova`, `base` (Base UI) e o `iconLibrary: lucide` do
`components.json`. Não trocar preset sem aprovação.

## 5. Componentes — specs do DS

Mapeamento entre o design system e a implementação shadcn:

| Componente | Spec DS | Implementação |
|------------|---------|---------------|
| Button Small | 32px | `size="sm"` (h-8) |
| Button Medium | 40px | `size="default"` (h-10) |
| Button Large | 48px | `size="lg"` (h-12) |
| Button label | Inter 16 Medium | `text-base font-medium` |
| Button Secondary | branco + borda navy + texto navy (hover cream) | `variant="secondary"` |
| Button radius | 8px | `rounded-lg` (`--radius-lg: 8px`) |
| Input height | 42px | `h-[42px]` |
| Input radius | 8px | `rounded-lg` |
| Input padding | 14px | `px-3.5` |
| Input font | Inter 14 Regular | `text-sm` |
| Input border | #E2E8F0 | `border-input` (`--input`) |
| Step Indicator bar | 6px / raio 3 / track #E6E9F0 | `ProgressTrack` `h-1.5 rounded-[3px] bg-primary-50` |
| Step fill | gold #E8A308 | `bg-secondary` (override do indicador) |
| Info Pill | raio 8, bg #FEF5E3, texto #263980 | `Alert variant="info"` (tokens) |
| Badge / pill | raio full 99px | `rounded-4xl` |

Feedback semântico: `Badge`, `Alert` e `Button` possuem variantes semânticas
`success`, `warning`, `info` e `destructive`.

Utilitários DS: `text-display` (48/56 bold) e `text-caption` (10px).

## 6. Checklist de PR (frontend)

- [ ] Usei tokens semânticos (nenhuma cor crua/hex).
- [ ] Componentes de feature em `app/**/_components`; primitivas só em `components/ui`.
- [ ] `gap-*` (sem `space-*`), `size-*` quando aplicável.
- [ ] `render` (Base UI) em vez de `asChild`.
- [ ] Ícones lucide com `data-icon` dentro de `Button`.
- [ ] `tsc --noEmit` sem novos erros.
- [ ] Sem `dark:` manual de cor.
