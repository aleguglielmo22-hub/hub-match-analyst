import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  FASCIA_INGAGGIO_LABEL,
  GESTI_MOTORI_LABEL,
  INFLUENZE_NEG,
  MUSCOLATURA_LABEL,
  PASSAPORTO_LABEL,
  PIEDE_LABEL,
  RATING_AREA_LABEL,
  RATING_AREA_MACRO,
  RATING_MACRO_LABEL,
  RATINGS,
  RUOLO_LABEL,
  SI_NO_AVOLTE_LABEL,
  STATUS_OSSERVAZIONE_LABEL,
  STRUTTURA_CORPOREA_LABEL,
  VOTO_POTENZIALE_LABEL,
  calcolaEta,
  type PlayerRow,
  type RatingArea,
  type RatingKey,
  type RatingMacroGroup,
} from "@/lib/types/scouting";

export const dynamic = "force-dynamic";

export default async function DettaglioGiocatorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const supabase = await createClient();
  const { data: player, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !player) notFound();
  const p = player as PlayerRow;

  // Solo il creatore o l'owner del workspace possono modificare (vedi RLS).
  const canEdit = workspace.isOwner || p.created_by === workspace.userId;

  const eta = calcolaEta(p.data_nascita);
  const dataNascitaFmt = p.data_nascita
    ? format(parseISO(p.data_nascita), "d MMMM yyyy", { locale: it })
    : null;
  const scadenzaFmt = p.scadenza_contratto
    ? format(parseISO(p.scadenza_contratto), "d MMMM yyyy", { locale: it })
    : null;
  const aggiornatoFmt = format(
    parseISO(p.data_ultimo_aggiornamento),
    "d MMM yyyy",
    { locale: it },
  );

  // Raggruppo RATINGS per macro-area
  const ratingsByMacro = new Map<
    RatingMacroGroup,
    Map<RatingArea, typeof RATINGS>
  >();
  for (const r of RATINGS) {
    const macro = RATING_AREA_MACRO[r.area];
    if (!ratingsByMacro.has(macro)) ratingsByMacro.set(macro, new Map());
    const m = ratingsByMacro.get(macro)!;
    if (!m.has(r.area)) m.set(r.area, []);
    m.get(r.area)!.push(r);
  }
  const MACRO_ORDER: RatingMacroGroup[] = [
    "TECNICA",
    "PSICOLOGIA",
    "FISICO",
    "PORTIERE",
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link
        href="/scouting"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Torna allo Scouting DB
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {p.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.foto_url}
              alt=""
              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-border/50"
            />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/30 text-2xl font-bold uppercase text-primary">
              {(p.nome ?? "").charAt(0)}
              {(p.cognome ?? "").charAt(0)}
            </span>
          )}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {p.nome}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight uppercase">
              {p.cognome}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {eta !== null && <span>{eta} anni</span>}
              {p.nazionalita && <span>· {p.nazionalita}</span>}
              {p.passaporto && (
                <span>· {PASSAPORTO_LABEL[p.passaporto]}</span>
              )}
              {p.piede && <span>· Piede {PIEDE_LABEL[p.piede]}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {canEdit && (
            <Link
              href={`/scouting/${p.id}/modifica`}
              className={buttonVariants({ variant: "outline", size: "default" })}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Modifica
            </Link>
          )}
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {STATUS_OSSERVAZIONE_LABEL[p.status_osservazione]}
            </Badge>
            {p.voto_potenziale && (
              <Badge variant="outline" className="text-[10px]">
                {VOTO_POTENZIALE_LABEL[p.voto_potenziale]}
              </Badge>
            )}
            {p.ruolo_principale && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {p.ruolo_principale}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Identità */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Identità & Tattica
          </h2>
          <dl className="space-y-2 text-sm">
            {dataNascitaFmt && (
              <Row label="Data di nascita" value={dataNascitaFmt} />
            )}
            {p.ruolo_principale && (
              <Row
                label="Ruolo principale"
                value={`${p.ruolo_principale} · ${RUOLO_LABEL[p.ruolo_principale]}`}
              />
            )}
            {p.ruoli_secondari.length > 0 && (
              <Row
                label="Ruoli secondari"
                value={p.ruoli_secondari.join(", ")}
              />
            )}
            {p.stili_gioco.length > 0 && (
              <Row label="Stili di gioco" value={p.stili_gioco.join(", ")} />
            )}
          </dl>
        </section>

        {/* Contratto */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Contratto & Mercato
          </h2>
          <dl className="space-y-2 text-sm">
            {p.squadra_attuale && (
              <Row label="Squadra attuale" value={p.squadra_attuale} />
            )}
            {p.campionato && <Row label="Campionato" value={p.campionato} />}
            {scadenzaFmt && <Row label="Scadenza contratto" value={scadenzaFmt} />}
            {p.agenzia && <Row label="Agenzia" value={p.agenzia} />}
            {typeof p.valore_mercato_eur === "number" && (
              <Row
                label="Valore di mercato"
                value={`€ ${p.valore_mercato_eur.toLocaleString("it-IT")}`}
              />
            )}
            {p.fascia_ingaggio && (
              <Row
                label="Fascia ingaggio"
                value={FASCIA_INGAGGIO_LABEL[p.fascia_ingaggio]}
              />
            )}
            {p.transfermarkt_url && (
              <Row
                label="Transfermarkt"
                value={
                  <a
                    href={p.transfermarkt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Apri scheda
                    <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
          </dl>
        </section>

        {/* Fisico */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Profilo fisico
          </h2>
          <dl className="space-y-2 text-sm">
            {p.altezza_cm && <Row label="Altezza" value={`${p.altezza_cm} cm`} />}
            {p.peso_kg && <Row label="Peso" value={`${p.peso_kg} kg`} />}
            {p.struttura_corporea && (
              <Row
                label="Struttura corporea"
                value={STRUTTURA_CORPOREA_LABEL[p.struttura_corporea]}
              />
            )}
            {p.gesti_motori && (
              <Row label="Gesti motori" value={GESTI_MOTORI_LABEL[p.gesti_motori]} />
            )}
            {p.muscolatura && (
              <Row label="Muscolatura" value={MUSCOLATURA_LABEL[p.muscolatura]} />
            )}
            {p.capacita_condizionali && (
              <Row label="Note condizionali" value={p.capacita_condizionali} />
            )}
          </dl>
        </section>

        {/* Workflow + Domande/Influenze */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Workflow & Comportamento
          </h2>
          <dl className="space-y-2 text-sm">
            <Row
              label="Status osservazione"
              value={STATUS_OSSERVAZIONE_LABEL[p.status_osservazione]}
            />
            {p.voto_potenziale && (
              <Row
                label="Voto potenziale"
                value={VOTO_POTENZIALE_LABEL[p.voto_potenziale]}
              />
            )}
            <Row label="Ultimo aggiornamento" value={aggiornatoFmt} />
            {p.scout_assegnato && (
              <Row label="Scout assegnato" value={p.scout_assegnato} />
            )}
            {p.behav_delega_altri && (
              <Row
                label="Delega gli altri"
                value={SI_NO_AVOLTE_LABEL[p.behav_delega_altri]}
              />
            )}
            {p.behav_assume_responsabilita && (
              <Row
                label="Si assume responsabilità"
                value={SI_NO_AVOLTE_LABEL[p.behav_assume_responsabilita]}
              />
            )}
            {(() => {
              const influenze = INFLUENZE_NEG.filter(
                (i) => (p as unknown as Record<string, boolean>)[i.key],
              );
              if (!influenze.length) return null;
              return (
                <Row
                  label="Influenza negativa"
                  value={influenze.map((i) => i.label).join(", ")}
                />
              );
            })()}
          </dl>
        </section>
      </div>

      {/* Matrice valutazioni */}
      <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
        <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Matrice valutazioni
        </h2>
        <div className="space-y-6">
          {MACRO_ORDER.map((macro) => {
            const areas = ratingsByMacro.get(macro);
            if (!areas) return null;
            return (
              <div key={macro} className="space-y-3">
                <h3 className="text-sm font-semibold tracking-tight text-foreground/90">
                  {RATING_MACRO_LABEL[macro]}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from(areas.entries()).map(([area, items]) => (
                    <div
                      key={area}
                      className="rounded-xl border border-border/40 bg-card/30 p-3"
                    >
                      {/* Mostra sub-label solo se la macro raggruppa più aree */}
                      {areas.size > 1 && (
                        <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {RATING_AREA_LABEL[area]}
                        </p>
                      )}
                      <ul className="space-y-1">
                        {items.map((r) => {
                          const val = (p as Record<string, unknown>)[
                            r.key as RatingKey
                          ] as number | null | undefined;
                          return (
                            <li
                              key={r.key}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="truncate text-muted-foreground">
                                {r.label}
                              </span>
                              <span
                                className={
                                  "inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold " +
                                  (typeof val === "number"
                                    ? "bg-primary/15 text-primary"
                                    : "bg-muted/40 text-muted-foreground")
                                }
                              >
                                {typeof val === "number" ? val : "—"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Media */}
      {(p.scouting_report_url ||
        p.note_rapide ||
        p.clip_video_urls.length > 0) && (
        <section className="space-y-4">
          {p.scouting_report_url && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Scouting report
              </h2>
              <a
                href={p.scouting_report_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                Apri PDF
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          {p.note_rapide && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Note rapide
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {p.note_rapide}
              </p>
            </div>
          )}
          {p.clip_video_urls.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Clip video ({p.clip_video_urls.length})
              </h2>
              <ul className="space-y-2">
                {p.clip_video_urls.map((url, i) => (
                  <li
                    key={url}
                    className="flex items-center gap-2 rounded-md border border-border/50 bg-card/30 px-3 py-2"
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      #{i + 1}
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-foreground/80 hover:text-primary"
                    >
                      {url}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}
