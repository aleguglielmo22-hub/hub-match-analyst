-- ============================================================
-- Fix: handle_new_user() non trovava public.profiles
-- Il trigger gira con SECURITY DEFINER ma il search_path del ruolo
-- "supabase_auth_admin" non include lo schema public di default.
-- Soluzione: qualifichiamo i nomi (public.*) e fissiamo SET search_path.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Se l'utente è stato pre-invitato, attiva la membership esistente
  UPDATE public.workspace_members
    SET user_id = NEW.id,
        status = 'ACTIVE',
        accepted_at = NOW()
    WHERE email_invitata = NEW.email AND status = 'PENDING';

  -- Altrimenti crea un workspace di sua proprietà
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members WHERE user_id = NEW.id AND status = 'ACTIVE'
  ) THEN
    INSERT INTO public.workspaces (owner_id) VALUES (NEW.id) RETURNING id INTO new_workspace_id;
    INSERT INTO public.workspace_members (workspace_id, user_id, email_invitata, role, status, accepted_at)
      VALUES (new_workspace_id, NEW.id, NEW.email, 'OWNER', 'ACTIVE', NOW());
  END IF;

  RETURN NEW;
END;
$$;

-- Anche set_updated_at e archive_items_update_search_vector hanno lo stesso rischio
-- se in futuro li chiamassimo da contesti con search_path diverso. Li sistemo per coerenza.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.archive_items_update_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('italian', coalesce(NEW.titolo_archivio, '')), 'A') ||
    setweight(to_tsvector('italian', coalesce(NEW.descrizione_estesa, '')), 'B');
  RETURN NEW;
END;
$$;
