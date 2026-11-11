/**
 * Sezioni del cestino unico: Lavoro (Scouting, Set Pieces, Training, Cloud)
 * e le sezioni personali di Studi, Benessere e Finanze (dal registro).
 * Tutte usano la colonna deleted_at: valorizzata = nel cestino.
 * Chi sposta/ripristina: owner o creatore (RLS update); eliminazione
 * definitiva: solo owner (RLS delete).
 */
import type { AttachmentEntity } from "@/lib/attachments/shared";
import { TRASHABLE_COLLECTIONS, detailHref, listHref, type CollectionKey } from "@/lib/hub/registry";

const CORE_SECTIONS = ["scouting", "set-pieces", "training", "cloud"] as const;
export type CoreTrashSection = (typeof CORE_SECTIONS)[number];
export type TrashSection = CoreTrashSection | CollectionKey;

export const TRASH_SECTIONS: readonly TrashSection[] = [
  ...CORE_SECTIONS,
  ...TRASHABLE_COLLECTIONS.map((c) => c.key as CollectionKey),
];

type SectionConfig = {
  label: string;
  table: string;
  /** Allegati nel bucket "media" (il Cloud usa archive_files nel bucket "archivio"). */
  attachmentEntity: AttachmentEntity | null;
  listHref: string;
  detailHref: (id: string) => string;
  /** Area della sezione (per raggruppare i filtri del cestino). */
  group: "Lavoro" | "Studi" | "Benessere" | "Finanze";
};

const CORE: Record<CoreTrashSection, SectionConfig> = {
  scouting: {
    label: "Scouting",
    table: "players",
    attachmentEntity: "player",
    listHref: "/scouting",
    detailHref: (id) => `/scouting/${id}`,
    group: "Lavoro",
  },
  "set-pieces": {
    label: "Set Pieces",
    table: "set_pieces",
    attachmentEntity: "set_piece",
    listHref: "/set-pieces",
    detailHref: (id) => `/set-pieces/${id}`,
    group: "Lavoro",
  },
  training: {
    label: "Training",
    table: "situational_tactics",
    attachmentEntity: "situational",
    listHref: "/situational",
    detailHref: (id) => `/situational/${id}`,
    group: "Lavoro",
  },
  cloud: {
    label: "Cloud",
    table: "archive_items",
    attachmentEntity: null,
    listHref: "/archivio",
    detailHref: (id) => `/archivio/${id}`,
    group: "Lavoro",
  },
};

const GROUP = { studi: "Studi", benessere: "Benessere", finanze: "Finanze" } as const;

export const TRASH_SECTION: Record<TrashSection, SectionConfig> = {
  ...CORE,
  ...(Object.fromEntries(
    TRASHABLE_COLLECTIONS.map((c) => [
      c.key,
      {
        label: c.label,
        table: c.table,
        attachmentEntity: null,
        listHref: listHref(c),
        detailHref: (id: string) => detailHref(c, id),
        group: GROUP[c.area],
      } satisfies SectionConfig,
    ]),
  ) as Record<CollectionKey, SectionConfig>),
};

export function isCoreSection(s: TrashSection): s is CoreTrashSection {
  return (CORE_SECTIONS as readonly string[]).includes(s);
}

export function parseTrashSection(v: string | null | undefined): TrashSection | null {
  return TRASH_SECTIONS.includes(v as TrashSection) ? (v as TrashSection) : null;
}
