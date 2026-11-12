-- 0029 — Rimozione delle aree personali (Studi, Benessere, Finanze).
--
-- AG Workspace torna a occuparsi solo del lavoro. Questa migrazione ELIMINA in modo
-- DEFINITIVO le tabelle create dalle migrazioni 0023-0028 e tutti i loro dati
-- (libri, corsi, esami, movimenti, allenamenti, schede, alimenti, parametri vitali,
-- chiave di sincronizzazione). Va applicata solo dopo il backup e la conferma
-- scritta dell'utente.
--
-- Nessuna tabella del lavoro (scouting, calci piazzati, training, cloud, lavagna…)
-- viene toccata. DROP senza CASCADE: se qualcosa di inatteso dipendesse da queste
-- tabelle, il comando si ferma con un errore invece di eliminare altro.

DROP FUNCTION IF EXISTS health_ingest(TEXT, JSONB);

DROP TABLE
  health_sync,
  health_metrics,
  nut_plans, nut_goals, nut_log, nut_foods,
  wk_sets, wk_sessions, wk_template_items, wk_templates, wk_exercises,
  fin_transactions, fin_recurring, fin_goals, fin_categories, fin_accounts,
  study_highlights, study_readings, study_exam_questions, study_exams,
  study_course_modules, study_courses, study_book_chapters, study_books;
