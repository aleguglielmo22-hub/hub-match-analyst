import type {
  AmbitoEnum,
  CategoriaLavoroEnum,
  SorgenteVideoEnum,
  TipoMediaEnum,
} from "@/lib/types/archivio";

/** Voce archivio nella forma usata dalle card della lista. */
export type ArchiveListItem = {
  id: string;
  titolo_archivio: string;
  data_lavoro: string; // ISO date "YYYY-MM-DD"
  ambito: AmbitoEnum;
  categoria_lavoro: CategoriaLavoroEnum;
  tipo_media: TipoMediaEnum[];
  team_principale: { nome: string } | null;
  team_avversario: { nome: string } | null;
  competition: { nome: string } | null;
};

export type ArchiveSort = "recent" | "oldest" | "az";

export const SORT_LABEL: Record<ArchiveSort, string> = {
  recent: "Più recenti",
  oldest: "Più vecchi",
  az: "A → Z (titolo)",
};

/** File già caricato su Storage e linkato a una voce. */
export type ArchiveExistingFile = {
  id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  tipo_media: TipoMediaEnum;
  posizione: number;
  /** Signed URL temporaneo (TTL 1h) generato dal server. */
  signed_url: string | null;
};

/** Voce archivio nella forma completa per dettaglio + modifica. */
export type ArchiveDetail = {
  id: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  data_lavoro: string;
  season_id: string | null;
  season: { id: string; label: string } | null;
  team_principale_id: string | null;
  team_principale: { id: string; nome: string } | null;
  team_avversario_id: string | null;
  team_avversario: { id: string; nome: string } | null;
  competition_id: string | null;
  competition: { id: string; nome: string } | null;
  ambito: AmbitoEnum;
  categoria_lavoro: CategoriaLavoroEnum;
  tipo_media: TipoMediaEnum[];
  sorgente_video: SorgenteVideoEnum | null;
  titolo_archivio: string;
  descrizione_estesa: string | null;

  files: ArchiveExistingFile[];
  tag_ids: string[];
  tags: { id: string; name: string }[];

  /** True se l'utente loggato può modificare/spostare nel cestino questa voce. */
  can_edit: boolean;
};

export type UpdateArchiveItemInput = {
  id: string;
  data_lavoro: string;
  season_id: string | null;
  team_principale_id: string | null;
  team_avversario_id: string | null;
  competition_id: string | null;
  ambito: AmbitoEnum;
  categoria_lavoro: CategoriaLavoroEnum;
  tipo_media: TipoMediaEnum[];
  sorgente_video: SorgenteVideoEnum | null;
  titolo_archivio: string;
  descrizione_estesa: string | null;
  tag_ids: string[];
  /** File da aggiungere (appena uploadati su Storage). */
  new_files: {
    file_name: string;
    file_path: string;
    file_size_bytes: number | null;
    mime_type: string | null;
    tipo_media: TipoMediaEnum;
    posizione: number;
  }[];
  /** archive_files.id da rimuovere (DB + Storage). */
  remove_file_ids: string[];
  /** Aggiornamenti di tipo_media su file esistenti (id → nuovo tipo_media). */
  update_file_tipi: { id: string; tipo_media: TipoMediaEnum }[];
};
