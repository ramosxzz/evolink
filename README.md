# Evolink

Interface demonstrável de acompanhamento integrado para nutrição, treino e evolução. Construída com Next.js App Router, TypeScript, Tailwind CSS, Lucide e Recharts.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Na tela de login, use **Entrar como aluno** ou **Entrar como profissional**. A navegação lateral é exibida em desktop; a navegação inferior é exibida em celulares.

## PWA

O app inclui manifesto, ícone, meta tags mobile, service worker e página offline. Em um servidor HTTPS (ou `localhost`), abra o menu do navegador e escolha **Instalar aplicativo**. No iOS, use Compartilhar → Adicionar à Tela de Início.

## Estrutura atual

- `src/app`: App Router, metadados e página offline
- `src/components/evolink-app.tsx`: sistema visual, layouts responsivos, páginas e interações demonstrativas
- `public`: manifesto, ícone e service worker

## Próxima integração com Supabase

Os arrays tipados no componente representam os mocks de alunos, refeições, pesos e mensagens. Para produção, mova esses contratos para `src/types`, use tabelas (`profiles`, `diet_plans`, `meals`, `workouts`, `checkins`, `progress_records`, `messages`) com RLS por profissional/aluno e substitua os mocks por queries do `@supabase/supabase-js`. O layout mantém a separação entre as áreas de aluno e profissional para facilitar essa troca.
