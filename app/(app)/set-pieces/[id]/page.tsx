import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft,
  ExternalLink,
  Goal,
  Pencil,
  Shield,
  Clock,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { isUuid, logLoadError } from "@/lib/load-result";
import { PageLoadError } from "@/components/app/load-error";
import { AttachmentsViewer } from "@/components/attachments/attachments-viewer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { LinkPendingIcon } from "@/components/app/link-pending-icon";
import { MoveToTrashButton } from "@/components/app/move-to-trash-button";
import { ArchiveLinksSection } from "@/components/links/archive-links-section";
import { SetPiecePlayersList } from "@/components/links/linked-lists";
import { RecordVisit } from "@/components/search/record-visit";
import { getSetPieceLinks } from "@/app/(app)/collegamenti/actions";
import { ESITO_TONE, FASE_SET_PIECE_TONE, TONE } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { videoEmbedUrl } from "@/lib/links/external-links";
import { parseBoardData } from "@/lib/board/schema";
import { signBoardPreviews } from "@/lib/board/persist";
import { BoardViewer } from "@/components/board/board-viewer";
import {
  ALTEZZA_LINEA_LABEL,
  esitoLabel,
  setPieceTeamName,
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

type SetPieceDetail = SetPieceRow & {
  team_esecutrice: { nome: string } | null;
  team_avversaria: { nome: string } | null;
  competition: { nome: string } | null;
  season: { label: string } | null;
};

export default async function DettaglioSetPiecePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Id non valido nell'indirizzo = elemento inesistente, non errore del server.
  if (!isUuid(id)) notFound();

  let workspace: Awaited<ReturnType<typeof getCurrentWorkspace>> = null;
  let data: SetPieceDetail | null = null;
  try {
    workspace = await getCurrentWorkspace();
    if (workspace) {
      const supabase = await createClient();
      const res = await supabase
        .from("set_pieces")
        .select(
          `*,
          team_esecutrice:teams!set_pieces_team_esecutrice_id_fkey(nome),
          team_avversaria:teams!set_pieces_team_avversaria_id_fkey(nome),
          competition:competitions(nome),
          season:seasons(label)`,
        )
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (res.error) throw res.error;
      data = res.data as unknown as SetPieceDetail | null;
    }
  } catch (err) {
    logLoadError("Set Pieces · dettaglio", err);
    return <PageLoadError />;
  }

  if (!workspace) redirect("/login");
  if (!data) notFound();
  const sp = data as SetPieceDetail;

  // Solo il creatore o l'owner del workspace possono modificare (vedi RLS).
  const canEdit = workspace.isOwner || sp.created_by === workspace.userId;
  const board = parseBoardData(sp.lavagna_dati);
  const [links, [boardPreviewUrl]] = await Promise.all([
    getSetPieceLinks(sp.id),
    board ? createClient().then((sb) => signBoardPreviews(sb, [sp.lavagna_anteprima])) : Promise.resolve([null]),
  ]);
  const isOffensive = sp.fase === "OFFENSIVO";
  // Nomi attuali delle anagrafiche collegate, altrimenti i vecchi testi.
  const esecutrice = setPieceTeamName(sp.team_esecutrice, sp.squadra_esecutrice);
  const avversaria = setPieceTeamName(sp.team_avversaria, sp.squadra_avversaria);
  const competizione = sp.competition?.nome ?? sp.competizione;
  const stagione = sp.season?.label ?? sp.stagione;
  const dataFmt = sp.data_evento
    ? format(parseISO(sp.data_evento), "EEEE d MMMM yyyy", { locale: it })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/set-pieces"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:-ml-2 max-md:min-h-11 max-md:px-2 max-md:text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Torna ai Set Pieces DB
        </Link>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/set-pieces/${sp.id}/modifica`}
              className={buttonVariants({ variant: "outline", size: "default" })}
            >
              <LinkPendingIcon className="mr-2 h-4 w-4">
                <Pencil className="mr-2 h-4 w-4" />
              </LinkPendingIcon>
              Modifica
            </Link>
            <MoveToTrashButton section="set-pieces" id={sp.id} title={sp.titolo} />
          </div>
        )}
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] inline-flex items-center gap-1 border-transparent ring-1",
              TONE[FASE_SET_PIECE_TONE[sp.fase]].badge,
            )}
          >
            {isOffensive ? (
              <Goal className="h-3 w-3" />
            ) : (
              <Shield className="h-3 w-3" />
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
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] border-transparent ring-1",
                // Colore = esito per la mia squadra (si inverte nei piazzati difensivi).
                TONE[ESITO_TONE[sp.fase][sp.esito_finale]].badge,
              )}
            >
              {esitoLabel(sp.esito_finale, sp.fase)}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {sp.titolo}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {esecutrice && (
            <span className="text-foreground/80 font-medium">
              {esecutrice}
            </span>
          )}
          {avversaria && (
            <>
              <span>vs</span>
              <span>{avversaria}</span>
            </>
          )}
          {(competizione || stagione) && (
            <>
              <span className="opacity-30">·</span>
              <span>
                {[competizione, stagione].filter(Boolean).join(" — ")}
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

      {/* Media: video player + lavagna (disegnata nell'app, altrimenti il vecchio link) */}
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

        {board ? (
          <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <header className="border-b border-border/40 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Lavagna tattica
            </header>
            <div className="p-2">
              <BoardViewer board={board} previewUrl={boardPreviewUrl} title={sp.titolo} />
            </div>
          </article>
        ) : null}
        {/* Vecchio link all'immagine: resta visibile se valorizzato. */}
        {sp.lavagna_image_url ? (
          <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <header className="border-b border-border/40 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Lavagna tattica
            </header>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sp.lavagna_image_url}
              alt={`Lavagna tattica: ${sp.titolo}`}
              className="block w-full max-h-[480px] object-contain bg-overlay/40"
            />
          </article>
        ) : !board ? (
          <article className="grid place-items-center rounded-2xl border border-dashed border-border/40 bg-card/20 p-10 text-center">
            <p className="text-xs text-muted-foreground">
              Nessuna lavagna.
            </p>
          </article>
        ) : null}
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
                value={esitoLabel(sp.esito_finale, sp.fase)}
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

      <RecordVisit
        kind="set_piece"
        id={sp.id}
        title={sp.titolo}
        subtitle={`${FASE_LABEL[sp.fase]} · ${TIPO_PIAZZATO_LABEL[sp.tipo_piazzato]}`}
        href={`/set-pieces/${sp.id}`}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SetPiecePlayersList
          players={links?.players ?? null}
          editHint={canEdit ? "Aggiungili da Modifica." : undefined}
        />
        <ArchiveLinksSection
          title="Clip e documenti"
          emptyText="Nessuna voce del Cloud collegata."
          canEdit={canEdit}
          initial={links?.archive ?? null}
          other={{ kind: "set_piece", id: sp.id }}
        />
      </div>

      <AttachmentsViewer entityType="set_piece" entityId={sp.id} />
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
  const embedUrl = videoEmbedUrl(url);
  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title="Video clip"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full bg-overlay"
      />
    );
  }
  // Fallback per MP4 / link diretto a file video
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return (
      <video
        controls
        preload="metadata"
        className="block aspect-video w-full bg-overlay"
        src={url}
      />
    );
  }
  // URL non riconosciuto (es. Wyscout): apre in nuova scheda
  return (
    <div className="flex aspect-video items-center justify-center bg-overlay/40 p-6 text-center">
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
