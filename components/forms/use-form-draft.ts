"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import {
  browserStorage,
  clearDraft,
  draftKey,
  itemChangedAfterDraft,
  loadDraft,
  saveDraft,
  type DraftSection,
} from "@/lib/forms/draft";

const SAVE_DELAY_MS = 800;
const LEAVE_MESSAGE =
  "Hai modifiche non salvate. Uscire comunque? La bozza resta salvata in questo browser.";

/** Contenuto della bozza: valori del form, stato extra (es. link) e id del nuovo elemento. */
type DraftData<V, X> = { values: V; extra?: X; itemId?: string };

/**
 * Data della bozza trovata all'apertura del form, letta una sola volta per
 * apertura (i salvataggi successivi non devono far ricomparire l'avviso).
 * Chiave: istanza del form (useId) + chiave della bozza.
 */
const draftAtOpen = new Map<string, number | null>();
const noopSubscribe = () => () => {};

export type PendingDraft = {
  savedAt: number;
  /** Solo in modifica: l'elemento è stato aggiornato dopo la bozza. */
  itemChangedAfter: boolean;
};

/**
 * Bozza automatica del form nel browser + avvisi quando si lascia la pagina
 * con modifiche non salvate. Gli allegati da caricare non entrano nella bozza.
 *
 * - `itemId`: null per i nuovi elementi (la bozza conserva anche `newItemId`,
 *   così un ripristino dopo un ricaricamento non crea doppioni).
 * - Finché l'avviso di bozza è aperto, il salvataggio automatico è in pausa
 *   per non sovrascrivere la bozza prima della scelta.
 */
export function useFormDraft<V extends FieldValues, X = undefined>({
  section,
  itemId,
  form,
  itemUpdatedAt,
  newItemId,
  onRestoreNewItemId,
  extra,
  onRestoreExtra,
}: {
  section: DraftSection;
  itemId: string | null;
  form: UseFormReturn<V>;
  itemUpdatedAt?: string;
  newItemId?: string;
  onRestoreNewItemId?: (id: string) => void;
  extra?: X;
  onRestoreExtra?: (extra: X) => void;
}) {
  const key = draftKey(section, itemId);
  const openKey = `${useId()}|${key}`;
  // Sul server non c'è localStorage: nessun avviso, poi il browser lo legge.
  const savedAtOpen = useSyncExternalStore(
    noopSubscribe,
    () => {
      if (!draftAtOpen.has(openKey)) {
        draftAtOpen.set(openKey, loadDraft(browserStorage(), key)?.savedAt ?? null);
      }
      return draftAtOpen.get(openKey) ?? null;
    },
    () => null,
  );
  const [dismissed, setDismissed] = useState(false);
  const pending: PendingDraft | null =
    savedAtOpen !== null && !dismissed
      ? {
          savedAt: savedAtOpen,
          itemChangedAfter: itemChangedAfterDraft(savedAtOpen, itemUpdatedAt),
        }
      : null;
  // Finché l'avviso è aperto il salvataggio automatico resta in pausa.
  const pendingRef = useRef(true);
  const hasPending = pending !== null;
  useEffect(() => {
    pendingRef.current = hasPending;
  }, [hasPending]);
  useEffect(() => () => void draftAtOpen.delete(openKey), [openKey]);
  const dirtyRef = useRef(false);
  const doneRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ extra, newItemId });
  useEffect(() => {
    latest.current = { extra, newItemId };
  }, [extra, newItemId]);

  const scheduleSave = useCallback(() => {
    if (doneRef.current) return;
    dirtyRef.current = true;
    if (pendingRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const data: DraftData<V, X> = {
        values: form.getValues(),
        extra: latest.current.extra,
        itemId: latest.current.newItemId,
      };
      saveDraft(browserStorage(), key, data);
    }, SAVE_DELAY_MS);
  }, [form, key]);

  // Ogni modifica ai campi del form.
  useEffect(() => {
    const sub = form.watch((_, info) => {
      // Solo le modifiche fatte dall'utente: i setValue/reset del codice
      // (azzeramenti per fase, ripristino) non contano.
      if (info.type === "change") scheduleSave();
    });
    return () => sub.unsubscribe();
  }, [form, scheduleSave]);

  // Ogni modifica allo stato extra (es. link del Cloud), esclusa l'apertura.
  const firstExtra = useRef(true);
  useEffect(() => {
    if (firstExtra.current) {
      firstExtra.current = false;
      return;
    }
    scheduleSave();
  }, [extra, scheduleSave]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Uscita dalla pagina: ricarica/chiusura scheda e link interni.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || doneRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || doneRef.current) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const restore = useCallback(() => {
    const draft = loadDraft<DraftData<V, X>>(browserStorage(), key);
    pendingRef.current = false;
    setDismissed(true);
    if (!draft) return;
    form.reset(draft.data.values);
    if (draft.data.extra !== undefined) onRestoreExtra?.(draft.data.extra);
    if (draft.data.itemId) onRestoreNewItemId?.(draft.data.itemId);
    dirtyRef.current = true;
  }, [form, key, onRestoreExtra, onRestoreNewItemId]);

  const discard = useCallback(() => {
    clearDraft(browserStorage(), key);
    pendingRef.current = false;
    setDismissed(true);
  }, [key]);

  /**
   * Dopo un salvataggio riuscito: cancella la bozza e non avvisa più all'uscita.
   * Con `continueEditing` il form resta aperto per un nuovo inserimento
   * (es. "Salva e osserva un altro giocatore") e la bozza riparte da zero.
   */
  const markSaved = useCallback(
    (opts?: { continueEditing?: boolean }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearDraft(browserStorage(), key);
      if (opts?.continueEditing) {
        dirtyRef.current = false;
      } else {
        doneRef.current = true;
      }
    },
    [key],
  );

  /** Per i pulsanti "Annulla": chiede conferma se ci sono modifiche non salvate. */
  const confirmLeave = useCallback(
    () => !dirtyRef.current || doneRef.current || window.confirm(LEAVE_MESSAGE),
    [],
  );

  return { pending, restore, discard, markSaved, confirmLeave };
}
