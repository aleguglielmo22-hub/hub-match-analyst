import Link from "next/link";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft, Pencil, Calendar, Trophy, Tag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AMBITO_LABEL,
  CATEGORIA_LAVORO_LABEL,
  TIPO_MEDIA_LABEL,
  SORGENTE_VIDEO_LABEL,
} from "@/lib/types/archivio";
import { ArchiveFilesViewer } from "./archive-files-viewer";
import { TrashButton } from "./trash-button";
import type { ArchiveDetail as ArchiveDetailType } from "@/app/(app)/archivio/types";

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export function ArchiveDetail({ item }: { item: ArchiveDetailType }) {
  const dataFormatted = format(parseISO(item.data_lavoro), "EEEE d MMMM yyyy", {
    locale: it,
  });
  const updatedFormatted = format(
    parseISO(item.updated_at),
    "d MMM yyyy, HH:mm",
    { locale: it },
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link
        href="/archivio"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Torna al Cloud
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {CATEGORIA_LAVORO_LABEL[item.categoria_lavoro]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {AMBITO_LABEL[item.ambito]}
            </Badge>
            {item.tipo_media.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {TIPO_MEDIA_LABEL[t]}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {item.titolo_archivio}
          </h1>
          <p className="text-xs capitalize text-muted-foreground">
            {dataFormatted}
          </p>
        </div>

        {item.can_edit && (
          <div className="flex items-center gap-2">
            <Link
              href={`/archivio/${item.id}/modifica`}
              className={buttonVariants({ variant: "outline", size: "default" })}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Modifica
            </Link>
            <TrashButton itemId={item.id} />
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Colonna sinistra: metadati */}
        <aside className="space-y-5">
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Contesto
            </h2>
            <div className="space-y-4">
              {(item.team_principale || item.team_avversario) && (
                <Meta
                  label="Squadre"
                  value={
                    <>
                      {item.team_principale && (
                        <span className="font-medium">
                          {item.team_principale.nome}
                        </span>
                      )}
                      {item.team_principale && item.team_avversario && (
                        <span className="mx-1.5 text-muted-foreground">·</span>
                      )}
                      {item.team_avversario?.nome}
                    </>
                  }
                />
              )}
              {item.competition && (
                <Meta
                  label="Competizione"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.competition.nome}
                    </span>
                  }
                />
              )}
              {item.season && (
                <Meta
                  label="Stagione"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.season.label}
                    </span>
                  }
                />
              )}
              {item.sorgente_video && (
                <Meta
                  label="Sorgente video"
                  value={SORGENTE_VIDEO_LABEL[item.sorgente_video]}
                />
              )}
            </div>
          </section>

          {item.descrizione_estesa && (
            <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Descrizione
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {item.descrizione_estesa}
              </p>
            </section>
          )}

          {item.tags.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Tag
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    <Tag className="h-3 w-3" />
                    {tag.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          <p className="text-[10px] text-muted-foreground/60">
            Aggiornato {updatedFormatted}
          </p>
        </aside>

        {/* Colonna destra: file */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            File allegati ({item.files.length})
          </h2>
          <ArchiveFilesViewer files={item.files} />
        </section>
      </div>
    </div>
  );
}
