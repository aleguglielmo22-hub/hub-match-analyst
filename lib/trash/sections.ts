/**
 * Sezioni del cestino unico (Scouting, Set Pieces, Training, Cloud).
 * Tutte usano la colonna deleted_at: valorizzata = nel cestino.
 * Chi sposta/ripristina: owner o creatore (RLS update); eliminazione
 * definitiva: solo owner (RLS delete).
 */
import type { AttachmentEntity } from "@/lib/attachments/shared";

export const TRASH_SECTIONS = ["scouting", "set-pieces", "training", "cloud"] as const;
export type TrashSection = (typeof TRASH_SECTIONS)[number];

type SectionConfig = {
  label: string;
  table: "players" | "set_pieces" | "situational_tactics" | "archive_items";
  /** Allegati nel bucket "media" (il Cloud usa archive_files nel bucket "archivio"). */
  attachmentEntity: AttachmentEntity | null;
  listHref: string;
  detailHref: (id: string) => string;
};

export const TRASH_SECTION: Record<TrashSection, SectionConfig> = {
  scouting: {
    label: "Scouting",
    table: "players",
    attachmentEntity: "player",
    listHref: "/scouting",
    detailHref: (id) => `/scouting/${id}`,
  },
  "set-pieces": {
    label: "Set Pieces",
    table: "set_pieces",
    attachmentEntity: "set_piece",
    listHref: "/set-pieces",
    detailHref: (id) => `/set-pieces/${id}`,
  },
  training: {
    label: "Training",
    table: "situational_tactics",
    attachmentEntity: "situational",
    listHref: "/situational",
    detailHref: (id) => `/situational/${id}`,
  },
  cloud: {
    label: "Cloud",
    table: "archive_items",
    attachmentEntity: null,
    listHref: "/archivio",
    detailHref: (id) => `/archivio/${id}`,
  },
};

export function parseTrashSection(v: string | null | undefined): TrashSection | null {
  return TRASH_SECTIONS.includes(v as TrashSection) ? (v as TrashSection) : null;
}
