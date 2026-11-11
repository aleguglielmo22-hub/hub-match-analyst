import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil, Plus } from "lucide-react";
import { SectionHeader } from "@/components/app/section-header";
import { MoveToTrashButton } from "@/components/app/move-to-trash-button";
import { LoadErrorBox as LoadError } from "@/components/app/load-error";
import { AREAS } from "@/components/app/nav-items";
import { cn } from "@/lib/utils";
import { isUuid } from "@/lib/load-result";
import { formatValue, initialValues } from "@/lib/hub/fields";
import {
  COLLECTIONS,
  collectionBySlug,
  detailHref,
  isCollectionKey,
  listHref,
  newLabel,
  type AreaKey,
  type CollectionDef,
} from "@/lib/hub/registry";
import { getRow, listRows, logSafeError, refLabelMaps, refOptionsFor, type Row } from "@/lib/hub/server";
import { statusBadgeClass } from "@/lib/hub/status";
import { CollectionView } from "./collection-view";
import { ItemForm } from "./item-form";
import { ChildrenSection } from "./children-section";
import { DuplicateButton } from "./duplicate-button";
import { DetailExtras, ListExtras } from "./extras";

function areaOf(area: AreaKey) {
  return AREAS.find((a) => a.key === area)!;
}

function resolve(area: AreaKey, slug: string): CollectionDef {
  const c = collectionBySlug(area, slug);
  if (!c) notFound();
  return c;
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:min-h-11">
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}

const PAGE = "mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10";

/* ------------------------------------------------------------------ */

export async function CollectionListPage({ area, slug }: { area: AreaKey; slug: string }) {
  const c = resolve(area, slug);
  const a = areaOf(area);
  let rows: Row[] = [];
  let refs: Awaited<ReturnType<typeof refOptionsFor>> = {};
  let failed = false;
  try {
    [rows, refs] = await Promise.all([listRows(c), refOptionsFor([c])]);
  } catch (err) {
    logSafeError(c.label, err);
    failed = true;
  }

  return (
    <div className={PAGE}>
      <BackLink href={a.href} label={a.label} />
      <SectionHeader
        icon={a.children.find((x) => x.href === listHref(c))?.icon ?? a.icon}
        eyebrow={a.label}
        title={c.label}
        subtitle={c.description}
        actions={
          <Link
            href={`${listHref(c)}/nuovo`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 max-md:min-h-11"
          >
            <Plus className="h-4 w-4" /> {newLabel(c)}
          </Link>
        }
      />
      {failed ? (
        <LoadError />
      ) : (
        <>
          <ListExtras collectionKey={c.key} rows={rows} refOptions={refs} />
          <CollectionView collectionKey={c.key} rows={rows} refLabels={refLabelMaps(c, refs)} emptyText={`Ancora nessun elemento: inizia da “${newLabel(c)}”.`} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export async function CollectionNewPage({ area, slug, template }: { area: AreaKey; slug: string; template?: string }) {
  const c = resolve(area, slug);
  const refs = await refOptionsFor([c]).catch((err) => {
    logSafeError(c.label, err);
    return {};
  });
  const idx = template !== undefined ? Number(template) : NaN;
  const tpl = Number.isInteger(idx) ? c.templates?.[idx] : undefined;

  return (
    <div className={cn(PAGE, "max-w-3xl")}>
      <BackLink href={listHref(c)} label={c.label} />
      <SectionHeader eyebrow={c.label} title={newLabel(c)} />
      {c.templates && c.templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Parti da un modello:</span>
          {c.templates.map((t, i) => (
            <Link
              key={t.label}
              href={`${listHref(c)}/nuovo?modello=${i}`}
              aria-current={tpl === t ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 max-md:min-h-9",
                tpl === t ? "border-primary/60 bg-primary/10 text-primary-text" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
      <ItemForm
        key={tpl?.label ?? "vuoto"}
        collectionKey={c.key}
        id={null}
        initial={initialValues(c.fields, null, tpl?.values)}
        refOptions={refs}
        cancelHref={listHref(c)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function loadDetail(c: CollectionDef, id: string) {
  if (!isUuid(id)) notFound();
  try {
    const row = await getRow(c, id);
    return { row, failed: false };
  } catch (err) {
    logSafeError(c.label, err);
    return { row: null, failed: true };
  }
}

export async function CollectionDetailPage({ area, slug, id }: { area: AreaKey; slug: string; id: string }) {
  const c = resolve(area, slug);
  const { row, failed } = await loadDetail(c, id);
  if (failed) {
    return (
      <div className={PAGE}>
        <LoadError />
      </div>
    );
  }
  if (!row) notFound();

  const childDefs = (c.children ?? []).filter((ch) => isCollectionKey(ch.collection));
  const childCols = childDefs.map((ch) => COLLECTIONS[ch.collection as keyof typeof COLLECTIONS]);
  let refs: Awaited<ReturnType<typeof refOptionsFor>> = {};
  let children: Row[][] = [];
  try {
    [refs, children] = await Promise.all([
      refOptionsFor([c, ...childCols]),
      Promise.all(childDefs.map((ch, i) => (ch.hidden ? Promise.resolve([] as Row[]) : listRows(childCols[i], { parentField: ch.parentField, parentId: id })))),
    ]);
  } catch (err) {
    logSafeError(c.label, err);
  }
  const labels = refLabelMaps(c, refs);
  const titleField = c.fields.find((f) => f.key === c.titleField)!;
  const title = formatValue(titleField, row[c.titleField], labels[c.titleField]) || "Senza titolo";
  const statusField = c.fields.find((f) => f.key === c.statusField);
  const shown = c.fields.filter((f) => f.key !== c.titleField && f.key !== c.statusField);

  return (
    <div className={cn(PAGE, "max-w-4xl")}>
      <BackLink href={listHref(c)} label={c.label} />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-text">{c.label}</p>
          <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {statusField && row[statusField.key] ? (
            <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs", statusBadgeClass(row[statusField.key]))}>
              {formatValue(statusField, row[statusField.key])}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`${detailHref(c, id)}/modifica`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted max-md:min-h-11"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifica
          </Link>
          <DuplicateButton collectionKey={c.key} id={id} />
          {c.trash && <MoveToTrashButton section={c.key as never} id={id} title={title} />}
        </div>
      </header>

      <DetailExtras collectionKey={c.key} row={row} refOptions={refs} />

      <dl className="grid gap-x-6 gap-y-4 rounded-xl border border-border bg-card/40 p-5 sm:grid-cols-2">
        {shown.map((f) => {
          const v = row[f.key];
          const text = formatValue(f, v, labels[f.key]);
          if (!text) return null;
          const wide = f.wide || f.type === "longtext";
          return (
            <div key={f.key} className={cn("min-w-0", wide && "sm:col-span-2")}>
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className={cn("mt-0.5 break-words text-sm", f.type === "longtext" && "whitespace-pre-line leading-relaxed")}>
                {f.type === "url" ? (
                  <a href={String(v)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-text hover:underline">
                    {String(v).replace(/^https?:\/\//, "").slice(0, 60)} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : f.type === "tags" ? (
                  <span className="flex flex-wrap gap-1.5">
                    {(v as string[]).map((t) => (
                      <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                  </span>
                ) : (
                  text
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {childDefs.map((ch, i) => (ch.hidden ? null : (
        <ChildrenSection
          key={`${ch.collection}-${ch.parentField}`}
          parentCollection={c.key}
          parentId={id}
          childKey={ch.collection}
          parentField={ch.parentField}
          label={ch.label}
          rows={children[i] ?? []}
          refOptions={refs}
        />
      )))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export async function CollectionEditPage({ area, slug, id }: { area: AreaKey; slug: string; id: string }) {
  const c = resolve(area, slug);
  const { row, failed } = await loadDetail(c, id);
  if (failed) {
    return (
      <div className={PAGE}>
        <LoadError />
      </div>
    );
  }
  if (!row) notFound();
  const refs = await refOptionsFor([c]).catch(() => ({}));

  return (
    <div className={cn(PAGE, "max-w-3xl")}>
      <BackLink href={detailHref(c, id)} label="Torna al dettaglio" />
      <SectionHeader eyebrow={c.label} title={`Modifica ${c.singular}`} />
      <ItemForm collectionKey={c.key} id={id} initial={initialValues(c.fields, row)} refOptions={refs} cancelHref={detailHref(c, id)} />
    </div>
  );
}
