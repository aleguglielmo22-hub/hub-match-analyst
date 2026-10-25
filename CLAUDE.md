@AGENTS.md

# Regole del progetto

## Git
- `AUDIT.md` non va mai committato (è anche in `.gitignore`).
- Push su GitHub: usare SSH.
  `git push git@github.com:aleguglielmo22-hub/hub-match-analyst.git main`
  (il push via HTTPS non ha credenziali configurate).

## Ogni modifica
- `npm run build`, `npm test` e lint sui file toccati senza errori.
- Riepilogo in parole semplici con l'elenco dei file toccati.
- Approvazione esplicita dell'utente prima di commit e push.
- Nessuna azione manuale richiesta all'utente, salvo indicazione diversa.

## Database (Supabase)
- Le modifiche alla struttura passano dalla Supabase CLI, con le migrazioni in `supabase/migrations/`.
- Progetto di questa app: `hub_match_analyst` (ref `zkojzlneouwlwcnafdjs`). Il progetto
  `club-analysis-hub` appartiene a un'altra app e non va mai toccato da questo repository.
  Prima di ogni comando sul database remoto, controllare che il progetto collegato sia questo.
- Mai comandi distruttivi (`supabase db reset`, drop di tabelle o colonne con dati, `truncate`)
  senza l'approvazione esplicita e scritta dell'utente per quel comando.
- Prima di ogni migrazione: chiedi all'utente di scaricare il backup dall'app
  (Impostazioni → Backup) e attendi la sua conferma scritta. Poi mostra lo SQL
  della migrazione spiegato in parole semplici e applicala solo dopo il suo ok.
  Non usare Docker né db dump.
- Mai rimuovere o rinominare colonne che contengono dati senza prima migrarli
  (le migrazioni 0006 e 0009 hanno fatto perdere dati in passato).

## File
- L'hub cataloga, non custodisce: i file pesanti (es. video) si salvano come link esterni;
  l'upload è solo per file leggeri.
