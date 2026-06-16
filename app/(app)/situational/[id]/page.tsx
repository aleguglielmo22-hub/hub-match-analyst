import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { AttachmentsViewer } from "@/components/attachments/attachments-viewer";
import { cn } from "@/lib/utils";
import {
  MACRO_FASE_BADGE,
  MACRO_FASE_DESC,
  MACRO_FASE_LABEL,
  SOTTO_FASE_DESC,
  SOTTO_FASE_LABEL,
  type SituationalRow,
} from "@/lib/types/situational";

export const dynamic = "force-dynamic";

export default async function DettaglioSituazionalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("situational_tactics")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) notFound();
  const s = data as SituationalRow;

  const macro = MACRO_FASE_BADGE[s.macro_fase];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link
        href="/situational"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Torna al Training
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ring-1",
              macro.bg,
              macro.text,
              macro.ring,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", macro.dot)} />
            {MACRO_FASE_LABEL[s.macro_fase]}
          </span>
          <span className="text-xs text-muted-foreground">
            · {MACRO_FASE_DESC[s.macro_fase]}
          </span>
        </div>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {SOTTO_FASE_LABEL[s.sotto_fase]}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {s.titolo}
        </h1>
        <p className="text-sm text-muted-foreground">
          {SOTTO_FASE_DESC[s.sotto_fase]}
        </p>
      </header>

      {/* Media: video + lavagna */}
      <div className="grid gap-4 lg:grid-cols-2">
        {s.video_url ? (
          <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <header className="border-b border-border/40 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Video reale
            </header>
            <VideoEmbed url={s.video_url} />
          </article>
        ) : null}
        {s.lavagna_url ? (
          <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <header className="border-b border-border/40 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Lavagna grafica
            </header>
            {/^(?:.*\.)(mp4|webm|mov)(\?|$)/i.test(s.lavagna_url) ? (
              <video
                controls
                preload="metadata"
                className="block aspect-video w-full bg-black"
                src={s.lavagna_url}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.lavagna_url}
                alt={`Lavagna: ${s.titolo}`}
                className="block w-full max-h-[480px] object-contain bg-black/40"
              />
            )}
          </article>
        ) : null}
      </div>

      {/* Info generali */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Info generali
          </h2>
          {s.numero_giocatori.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                Numero giocatori
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {s.numero_giocatori.map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    <Users className="h-3 w-3" />
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}
          {s.spazio_dimensioni && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                Spazio / Dimensioni
              </p>
              <p className="text-sm">{s.spazio_dimensioni}</p>
            </div>
          )}
          {s.autori.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                Autori / Fonte
              </p>
              <p className="text-sm">{s.autori.join(" · ")}</p>
            </div>
          )}
        </div>

        {s.focus_tags.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-3">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Focus tattico
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {s.focus_tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Esercitazione pratica */}
      {(s.descrizione_flusso || s.regole_provocazione || s.varianti) && (
        <section className="space-y-4">
          {s.descrizione_flusso && (
            <article className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Descrizione del flusso
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {s.descrizione_flusso}
              </p>
            </article>
          )}
          {s.regole_provocazione && (
            <article className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Regole di provocazione
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {s.regole_provocazione}
              </p>
            </article>
          )}
          {s.varianti && (
            <article className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Varianti
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {s.varianti}
              </p>
            </article>
          )}
        </section>
      )}

      {/* PDF scheda */}
      {s.pdf_url && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Scheda esercizio</p>
                <p className="text-xs text-muted-foreground">
                  PDF pronto da scaricare o stampare per le sessioni.
                </p>
              </div>
            </div>
            <a
              href={s.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Scarica
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </section>
      )}

      <AttachmentsViewer entityType="situational" entityId={s.id} />
    </div>
  );
}

/** Embed video smart (YouTube/Vimeo iframe vs MP4 nativo vs link). */
function VideoEmbed({ url }: { url: string }) {
  const isYouTube = /youtube\.com|youtu\.be/.test(url);
  const isVimeo = /vimeo\.com/.test(url);
  if (isYouTube || isVimeo) {
    const embedUrl = toEmbedUrl(url, isYouTube ? "youtube" : "vimeo");
    return (
      <iframe
        src={embedUrl}
        title="Video"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full bg-black"
      />
    );
  }
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
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    return `https://player.vimeo.com/video/${id}`;
  } catch {
    return url;
  }
}
