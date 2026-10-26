"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  detectLinkSource,
  LINK_LABEL_MAX,
  LINK_SOURCE_LABEL,
  normalizeExternalUrl,
} from "@/lib/links/external-links";
import { LinkSourceIcon } from "./link-source-icon";

export type LinkDraft = {
  /** id locale, usato solo per la react key. */
  uid: string;
  /** id del link già salvato (solo in modifica). */
  id?: string;
  url: string;
  etichetta: string;
  /** Messaggio mostrato sotto la riga dopo un tentativo di salvataggio. */
  error?: string;
};

export function newLinkDraft(): LinkDraft {
  return { uid: crypto.randomUUID(), url: "", etichetta: "" };
}

/**
 * Controlla i link prima del salvataggio. Le righe vuote vengono scartate;
 * ritorna null (con gli errori impostati sulle righe) se qualcosa non va.
 */
export function validateLinkDrafts(
  drafts: LinkDraft[],
): { ok: true; links: { id?: string; url: string; etichetta: string | null }[] } | { ok: false; drafts: LinkDraft[] } {
  let failed = false;
  const checked = drafts
    .filter((d) => d.url.trim() || d.etichetta.trim())
    .map((d) => {
      const url = normalizeExternalUrl(d.url);
      if (!url) {
        failed = true;
        return {
          ...d,
          error: d.url.trim()
            ? "Indirizzo non valido (es. drive.google.com/…)"
            : "Inserisci l'indirizzo del link",
        };
      }
      return { ...d, url, error: undefined };
    });
  if (failed) return { ok: false, drafts: checked };
  return {
    ok: true,
    links: checked.map((d) => ({
      id: d.id,
      url: d.url,
      etichetta: d.etichetta.trim() || null,
    })),
  };
}

export function LinksEditor({
  links,
  onChange,
}: {
  links: LinkDraft[];
  onChange: (next: LinkDraft[]) => void;
}) {
  function update(uid: string, patch: Partial<LinkDraft>) {
    onChange(
      links.map((l) => (l.uid === uid ? { ...l, ...patch, error: undefined } : l)),
    );
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...links];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((l, i) => {
            const normalized = normalizeExternalUrl(l.url);
            const source = normalized ? detectLinkSource(normalized) : "altro";
            return (
              <li
                key={l.uid}
                className={cn(
                  "space-y-2 rounded-lg border bg-card/40 p-3",
                  l.error ? "border-destructive/50" : "border-border/60",
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary max-md:h-11 max-md:w-11"
                    title={normalized ? LINK_SOURCE_LABEL[source] : undefined}
                  >
                    <LinkSourceIcon source={source} className="h-4 w-4" />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <Input
                      value={l.url}
                      onChange={(e) => update(l.uid, { url: e.target.value })}
                      placeholder="Indirizzo, es. drive.google.com/…"
                      inputMode="url"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label={`Indirizzo del link ${i + 1}`}
                      aria-invalid={!!l.error}
                    />
                    <Input
                      value={l.etichetta}
                      onChange={(e) => update(l.uid, { etichetta: e.target.value })}
                      placeholder="Etichetta (facoltativa)"
                      maxLength={LINK_LABEL_MAX}
                      aria-label={`Etichetta del link ${i + 1}`}
                    />
                  </div>
                  <div className="flex shrink-0 items-center max-sm:flex-col">
                    <IconButton
                      label="Sposta su"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="Sposta giù"
                      disabled={i === links.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="Rimuovi link"
                      onClick={() => onChange(links.filter((x) => x.uid !== l.uid))}
                      destructive
                    >
                      <X className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
                {l.error && (
                  <p className="text-xs text-destructive" role="alert">
                    {l.error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...links, newLinkDraft()])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Aggiungi link
      </Button>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-md text-muted-foreground disabled:pointer-events-none disabled:opacity-30 max-md:h-11 max-md:w-11",
        destructive
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
