# AG Workspace

Hub personale per il match analyst: scouting dei giocatori con osservazioni
datate, database dei calci piazzati, catalogo di esercitazioni e un Cloud che
cataloga partite, clip e documenti tramite link esterni. Le sezioni sono
collegate tra loro e c'è una ricerca globale (⌘K / Ctrl+K). L'app si può
installare sul telefono (PWA).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, server actions) con React e TypeScript
- [Supabase](https://supabase.com): database Postgres con regole di accesso (RLS),
  login con email e password, Storage solo per i file leggeri
- Tailwind CSS 4, componenti Base UI / shadcn, React Hook Form + Zod
- Deploy su Vercel

## Comandi

```bash
npm install          # dipendenze
npm run dev          # sviluppo su http://localhost:3000
npm run build        # build di produzione
npm test             # test (runner integrato di Node, file *.test.mjs in lib/)
npm run lint         # lint
npm run db:types     # rigenera lib/types/database.ts dal progetto Supabase collegato
node scripts/generate-icons.mjs   # rigenera le icone della PWA in public/icons/
```

Le variabili d'ambiente vanno in `.env.local` (escluso da git): vedi
`.env.local.example`.

## Struttura

- `app/` — landing, `(auth)/login` e le sezioni protette in `(app)/`
- `components/` — componenti dell'interfaccia, divisi per sezione
- `lib/` — logica condivisa, schemi, tipi e relativi test
- `supabase/migrations/` — migrazioni del database, applicate con la Supabase CLI
- `proxy.ts` — sessione, accesso alle pagine protette e ritorno dopo il login

## Regole del progetto

Le regole di lavoro (git, database, migrazioni, backup, file) sono in
[CLAUDE.md](CLAUDE.md).
