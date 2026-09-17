<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:shadcn-design-system -->
# shadcn/ui + Nexus Design System (obrigatório)

Guia completo: `docs/shadcn-standards.md`. Regras ao escrever UI:

- Use **shadcn/ui** (`components/ui`) para toda UI. Não crie `div` estilizado se
  existir primitiva. Adicione componentes via CLI (`npx shadcn@latest add ...`),
  preservando `base-nova` + Base UI + lucide.
- **Tokens semânticos, nunca cor crua** (`bg-success`, `text-muted-foreground`).
  Sem `dark:` manual de cor. Tokens em `app/globals.css` (`@theme inline`).
- Componentes de feature ficam **colocados na rota** (`app/**/_components`);
  primitivas só em `components/ui`.
- **Base UI**: troque elemento com a prop **`render`** (ex.:
  `render={<Link href="/x" />}`). **Não existe `asChild`.**
- `gap-*` (nunca `space-*`); `size-*` quando largura = altura; ícones lucide com
  `data-icon` dentro de `Button`.
- Gráficos via shadcn `chart` (Recharts).
- Specs DS: Button 32/40/48px (sm/default/lg), Input 42px, radii xs4/sm8/md16/full99.
<!-- END:shadcn-design-system -->
