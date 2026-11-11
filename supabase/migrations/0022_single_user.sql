-- 0022 — App a utente singolo: niente più collaboratori né nuovi account.
--
-- Solo aggiunte e sostituzioni: nessuna tabella, colonna o riga cancellata,
-- nessuna regola esistente rimossa. La tabella workspace_members resta com'è
-- (AG Tag e AG Studio la leggono per trovare lo spazio di lavoro).

-- 1) Membri: nessuno può più aggiungerli, modificarli o eliminarli dall'app ----
-- Regole "restrittive": valgono in aggiunta a quelle esistenti e, con `false`,
-- rifiutano sempre l'operazione. La lettura resta permessa come prima.
-- Le procedure interne del database (come quella qui sotto) non sono toccate.
CREATE POLICY "members_no_insert" ON workspace_members
  AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "members_no_update" ON workspace_members
  AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "members_no_delete" ON workspace_members
  AS RESTRICTIVE FOR DELETE USING (false);

-- 2) Inviti e collaboratori esistenti: revocati (righe conservate) -------------
-- Chi è revocato non vede più nulla: l'accesso conta solo i membri attivi.
UPDATE workspace_members
  SET status = 'REVOKED'
  WHERE role = 'COLLABORATOR' AND status <> 'REVOKED';

-- 3) Nuovi account: ammessa solo l'email autorizzata ---------------------------
-- Stessa lista di lib/auth/allowlist.ts. Qualsiasi altra registrazione viene
-- rifiutata dal database, anche se fatta senza passare dall'app.
-- Niente più attivazione automatica degli inviti.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  IF lower(btrim(coalesce(NEW.email, ''))) NOT IN ('aleguglielmo22@gmail.com') THEN
    RAISE EXCEPTION 'Registrazione non consentita' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.workspaces (owner_id) VALUES (NEW.id) RETURNING id INTO new_workspace_id;
  INSERT INTO public.workspace_members (workspace_id, user_id, email_invitata, role, status, accepted_at)
    VALUES (new_workspace_id, NEW.id, NEW.email, 'OWNER', 'ACTIVE', NOW());

  RETURN NEW;
END;
$$;
