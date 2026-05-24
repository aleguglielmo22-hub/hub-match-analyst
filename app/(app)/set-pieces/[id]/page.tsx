import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft,
  ExternalLink,
  Goal,
  Shield,
  Clock,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import {
  ALTEZZA_LINEA_LABEL,
  ESITO_FINALE_LABEL,
  FASE_LABEL,
  LATO_BATTUTA_LABEL,
  PIEDE_BATTITORE_LABEL,
  SISTEMA_MARCATURA_LABEL,
  SPECIFICAZIONE_PUNIZIONE_LABEL,
  SVILUPPO_SCHEMA_LABEL,
  TIPO_PIAZZATO_LABEL,
  TRAIETTORIA_LABEL,
  UOMINI_SUI_PALI_LABEL,
  type SetPieceRow,
} from "@/lib/types/set-pieces";

export const dynamic = "force-dynamic";

export default async function DettaglioSetPiecePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("set_pieces")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) notFound();
  const sp = data as SetPieceRow;

  const isOffensive = sp.fase === "OFFENSIVO";
  const dataFmt = sp.data_evento
    ? format(parseISO(sp.data_evento), "EEEE d MMMM yyyy", { locale: it })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link
        href="/set-pieces"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Torna ai Set Pieces
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className="text-[10px] inline-flex items-center gap-1"
          >
            {isOffensive ? (
              <Goal className="h-3 w-3 text-primary" />
            ) : (
              <Shield className="h-3 w-3 text-primary" />
            )}
            {FASE_LABEL[sp.fase]}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {TIPO_PIAZZATO_LABEL[sp.tipo_piazzato]}
          </Badge>
          {sp.specificazione_punizione && (
            <Badge variant="outline" className="text-[10px]">
              {SPECIFICAZIONE_PUNIZIONE_LABEL[sp.specificazione_punizione]}
            </Badge>
          )}
          {sp.esito_finale && (
            <Badge variant="outline" className="text-[10px]">
              {ESITO_FINALE_LABEL[sp.esito_finale]}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {sp.titolo}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {sp.squadra_esecutrice && (
            <span className="text-foreground/80 font-medium">
              {sp.squadra_esecutrice}
            </span>
          )}
          {sp.squadra_avversaria && (
            <>
              <span>vs</span>
              <span>{sp.squadra_avversaria}</span>
            </>
          )}
          {(sp.competizione || sp.stagione) && (
            <>
              <span className="opacity-30">·</span>
              <span>
                {[sp.competizione, sp.stagione].filter(Boolean).join(" — ")}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {dataFmt && <span className="capitalize">{dataFmt}</span>}
          {typeof sp.minuto === "number" && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              minuto {sp.minuto}
            </span>
          )}
          {sp.punteggio && (
            <span className="font-mono">Punteggio: {sp.punteggio}</span>
          )}
        </div>
      </header>

      {/* Media: video player + lavagna immagine */}
      <div className="grid gap-4 lg:grid-cols-2">
        {sp.video_url ? (
          <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <header className="border-b border-border/40 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Video clip
            </header>
            <VideoEmbed url={sp.video_url} />
          </article>
        ) : (
          <article className="grid place-items-center rounded-2xl border border-dashed border-border/40 bg-card/20 p-10 text-center">
            <div className="space-y-2">
              <Target className="mx-auto h-6 w-6 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">
                Nessun video clip associato.
              </p>
            </div>
          </article>
        )}

        {sp.lavagna_image_url ? (
          <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <header className="border-b border-border/40 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Lavagna tattica
            </header>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sp.lavagna_image_url}
              alt={`Lavagna tattica: ${sp.titolo}`}
              className="block w-full max-h-[480px] object-contain bg-black/40"
            />
          </article>
        ) : (
          <article className="grid place-items-center rounded-2xl border border-dashed border-border/40 bg-card/20 p-10 text-center">
            <p className="text-xs text-muted-foreground">
              Nessuna immagine della lavagna.
            </p>
          </article>
        )}
      </div>

      {/* Dettagli per fase */}
      <div className="grid gap-4 lg:grid-cols-2">
        {isOffensive && (
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Dettagli offensivi
            </h2>
            <dl className="space-y-2 text-sm">
              {sp.piede_battitore && (
                <Row
                  label="Piede battitore"
                  value={PIEDE_BATTITORE_LABEL[sp.piede_battitore]}
                />
              )}
              {sp.traiettoria && (
                <Row label="Traiettoria" value={TRAIETTORIA_LABEL[sp.traiettoria]} />
              )}
              {sp.sviluppo_schema && (
                <Row
                  label="Sviluppo schema"
                  value={SVILUPPO_SCHEMA_LABEL[sp.sviluppo_schema]}
                />
              )}
              {sp.landing_zones.length > 0 && (
                <Row
                  label="Zone di caduta palla"
                  value={sp.landing_zones.join(", ")}
                />
              )}
              {sp.behavior_tags.length > 0 && (
                <Row
                  label="Comportamenti chiave"
                  value={sp.behavior_tags.join(", ")}
                />
              )}
              {typeof sp.giocatori_in_area === "number" && (
                <Row label="Giocatori in area" value={sp.giocatori_in_area} />
              )}
              {sp.lato_battuta && (
                <Row
                  label="Lato di battuta"
                  value={LATO_BATTUTA_LABEL[sp.lato_battuta]}
                />
              )}
            </dl>
          </section>
        )}

        {!isOffensive && (
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Dettagli difensivi
            </h2>
            <dl className="space-y-2 text-sm">
              {sp.sistema_marcatura && (
                <Row
                  label="Sistema di marcatura"
                  value={SISTEMA_MARCATURA_LABEL[sp.sistema_marcatura]}
                />
              )}
              {typeof sp.uomini_in_barriera === "number" && (
                <Row label="Uomini in barriera" value={sp.uomini_in_barriera} />
              )}
              {sp.uomini_sui_pali && (
                <Row
                  label="Uomini sui pali"
                  value={UOMINI_SUI_PALI_LABEL[sp.uomini_sui_pali]}
                />
              )}
              {sp.altezza_linea_difensiva && (
                <Row
                  label="Altezza linea difensiva"
                  value={ALTEZZA_LINEA_LABEL[sp.altezza_linea_difensiva]}
                />
              )}
              {typeof sp.giocatori_in_transizione === "number" && (
                <Row
                  label="Giocatori in transizione (+)"
                  value={sp.giocatori_in_transizione}
                />
              )}
              {sp.lato_battuta && (
                <Row
                  label="Lato di battuta"
                  value={LATO_BATTUTA_LABEL[sp.lato_battuta]}
                />
              )}
            </dl>
          </section>
        )}

        {/* Esito */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Esito
          </h2>
          <dl className="space-y-2 text-sm">
            {sp.esito_finale && (
              <Row
                label="Esito finale"
                value={ESITO_FINALE_LABEL[sp.esito_finale]}
              />
            )}
          </dl>
          {sp.note_esito && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {sp.note_esito}
            </p>
          )}
        </section>
      </div>

      {sp.pdf_url && (
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Documento PDF
          </h2>
          <a
            href={sp.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Apri PDF
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
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

/**
 * Embed video. Per file MP4 diretti usa <video>; per URL YouTube/Vimeo usa iframe.
 */
function VideoEmbed({ url }: { url: string }) {
  const isYouTube = /youtube\.com|youtu\.be/.test(url);
  const isVimeo = /vimeo\.com/.test(url);
  if (isYouTube || isVimeo) {
    const embedUrl = toEmbedUrl(url, isYouTube ? "youtube" : "vimeo");
    return (
      <iframe
        src={embedUrl}
        title="Video clip"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full bg-black"
      />
    );
  }
  // Fallback per MP4 / link diretto a file video
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return (
      <video
        controls
        preload="metadata"
        className="block aspect-video w-full bg-black"
        src={url}
      />
    );
  }
  // URL non riconosciuto (es. Wyscout): apre in nuova scheda
  return (
    <div className="flex aspect-video items-center justify-center bg-black/40 p-6 text-center">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        Apri clip in una nuova scheda
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function toEmbedUrl(url: string, provider: "youtube" | "vimeo"): string {
  try {
    const u = new URL(url);
    if (provider === "youtube") {
      const id =
        u.searchParams.get("v") ||
        u.pathname.replace("/embed/", "").replace(/^\//, "");
      return `https://www.youtube.com/embed/${id}`;
    }
    // Vimeo: pathname tipo "/123456789"
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    return `https://player.vimeo.com/video/${id}`;
  } catch {
    return url;
  }
}
