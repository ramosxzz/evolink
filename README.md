# Evolink

PWA de acompanhamento integrado de treino, nutrição e evolução, conectando **profissional** (personal / nutricionista) e **aluno**.

Produção: https://evolink.solairew.com.br

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4, Lucide, Motion, Recharts
- Supabase: Auth, Postgres com RLS, triggers de notificação e cobrança

## Rodar localmente

```bash
cp .env.example .env.local   # preencha URL e publishable key do Supabase
npm install
npm run dev
```

Abra `http://localhost:3000` e crie uma conta de aluno ou de profissional.

Scripts úteis: `npm run lint`, `npm run typecheck`, `npm run build`.

## Estrutura

```
src/
  app/
    [[...slug]]/page.tsx       rota única; renderiza OperationalApp
    api/invites/redeem/        resgate de convite (usa service role no servidor)
    offline/                   página exibida pelo service worker sem rede
  components/
    operational-app.tsx        roteador client-side por papel (aluno/profissional)
    app-shell.tsx              Shell (navegação, notificações, PWA), PageTitle, Button, Avatar
    brand-auth.tsx             login, cadastro e recuperação de senha
    operational-pages.tsx      páginas "Live*" ligadas ao Supabase
    professional-pages.tsx     financeiro, modelos, biblioteca, configurações
    professional-crm-page.tsx  lembretes automáticos para alunos
    workout-logbook-page.tsx   diário de treino e feed da comunidade
    wellness-pages.tsx         cardio e hábitos (ainda com dados locais)
  lib/
    evolink-data.ts            consultas e mutações do Supabase
    logbook-data.ts            sessões de treino, séries e feed social
    supabase/client.ts         cliente browser
supabase/migrations/           schema, RLS e funções
public/                        manifesto, ícones e service worker
```

### Rotas

- Aluno: `/aluno`, `/dieta`, `/treino`, `/check-in`, `/evolucao`, `/cardio`, `/habitos`, `/comunidade`, `/chat`, `/perfil`
- Profissional: `/profissional`, `/alunos`, `/treinos`, `/dietas`, `/check-ins`, `/crm`, `/financeiro`, `/modelos`, `/biblioteca/exercicios`, `/comunidade`, `/chat`, `/configuracoes`

O papel vem de `profiles.role`; `OperationalApp` redireciona quem tenta acessar a área do outro papel e bloqueia alunos com acesso suspenso por inadimplência.

## Banco de dados

Projeto Supabase **Evolink**. Migrations em `supabase/migrations`:

```bash
supabase link --project-ref <ref>
supabase db push
```

## Deploy (Hostinger / Docker)

A produção roda em um container Docker (`compose.production.yml`) atrás do Caddy na VPS.

1. Copie `.deploy/hostinger/deploy.env.example` para `.deploy/hostinger/deploy.env` e preencha o host e a chave SSH (o arquivo é ignorado pelo git).
2. No servidor, o `.env` em `/opt/evolink` precisa de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Rode:

```bash
npm run deploy
```

O script envia o projeto via rsync, reconstrói o container, espera o healthcheck e valida `/login` no domínio público.

## PWA

Manifesto, ícones, service worker (`public/sw.js`, network-first, só mesma origem) e página offline. Em HTTPS, use **Instalar aplicativo** no navegador; no iOS, Compartilhar → Adicionar à Tela de Início.
