export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      archive_files: {
        Row: {
          archive_item_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          posizione: number
          tipo_media: Database["public"]["Enums"]["tipo_media_enum"]
        }
        Insert: {
          archive_item_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          posizione?: number
          tipo_media: Database["public"]["Enums"]["tipo_media_enum"]
        }
        Update: {
          archive_item_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          posizione?: number
          tipo_media?: Database["public"]["Enums"]["tipo_media_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "archive_files_archive_item_id_fkey"
            columns: ["archive_item_id"]
            isOneToOne: false
            referencedRelation: "archive_items"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_item_tags: {
        Row: {
          archive_item_id: string
          tag_id: string
        }
        Insert: {
          archive_item_id: string
          tag_id: string
        }
        Update: {
          archive_item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_item_tags_archive_item_id_fkey"
            columns: ["archive_item_id"]
            isOneToOne: false
            referencedRelation: "archive_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_items: {
        Row: {
          ambito: Database["public"]["Enums"]["ambito_enum"]
          categoria_lavoro: Database["public"]["Enums"]["categoria_lavoro_enum"]
          competition_id: string | null
          created_at: string
          created_by: string
          data_lavoro: string
          deleted_at: string | null
          descrizione_estesa: string | null
          id: string
          search_vector: unknown
          season_id: string | null
          sorgente_video:
            | Database["public"]["Enums"]["sorgente_video_enum"]
            | null
          team_avversario_id: string | null
          team_principale_id: string | null
          tipo_media: Database["public"]["Enums"]["tipo_media_enum"][]
          titolo_archivio: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ambito: Database["public"]["Enums"]["ambito_enum"]
          categoria_lavoro: Database["public"]["Enums"]["categoria_lavoro_enum"]
          competition_id?: string | null
          created_at?: string
          created_by: string
          data_lavoro: string
          deleted_at?: string | null
          descrizione_estesa?: string | null
          id?: string
          search_vector?: unknown
          season_id?: string | null
          sorgente_video?:
            | Database["public"]["Enums"]["sorgente_video_enum"]
            | null
          team_avversario_id?: string | null
          team_principale_id?: string | null
          tipo_media?: Database["public"]["Enums"]["tipo_media_enum"][]
          titolo_archivio: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ambito?: Database["public"]["Enums"]["ambito_enum"]
          categoria_lavoro?: Database["public"]["Enums"]["categoria_lavoro_enum"]
          competition_id?: string | null
          created_at?: string
          created_by?: string
          data_lavoro?: string
          deleted_at?: string | null
          descrizione_estesa?: string | null
          id?: string
          search_vector?: unknown
          season_id?: string | null
          sorgente_video?:
            | Database["public"]["Enums"]["sorgente_video_enum"]
            | null
          team_avversario_id?: string | null
          team_principale_id?: string | null
          tipo_media?: Database["public"]["Enums"]["tipo_media_enum"][]
          titolo_archivio?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_items_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_items_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_items_team_avversario_id_fkey"
            columns: ["team_avversario_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_items_team_principale_id_fkey"
            columns: ["team_principale_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          posizione: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          posizione?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          posizione?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          id: string
          livello: string | null
          nome: string
          paese: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          livello?: string | null
          nome: string
          paese?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          livello?: string | null
          nome?: string
          paese?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          agenzia: string | null
          altezza_cm: number | null
          behav_assume_responsabilita:
            | Database["public"]["Enums"]["si_no_avolte_enum"]
            | null
          behav_delega_altri:
            | Database["public"]["Enums"]["si_no_avolte_enum"]
            | null
          campionato: string | null
          capacita_condizionali: string | null
          clip_video_urls: string[]
          cognome: string
          created_at: string
          created_by: string
          data_nascita: string | null
          data_ultimo_aggiornamento: string
          deleted_at: string | null
          fascia_ingaggio:
            | Database["public"]["Enums"]["fascia_ingaggio_enum"]
            | null
          fis_accelerazione: number | null
          fis_agilita: number | null
          fis_elevazione: number | null
          fis_equilibrio: number | null
          fis_forza: number | null
          fis_integrita: number | null
          fis_resistenza: number | null
          fis_velocita: number | null
          foto_url: string | null
          gesti_motori: Database["public"]["Enums"]["gesti_motori_enum"] | null
          gk_comando_area: number | null
          gk_comunicazione: number | null
          gk_eccentricita: number | null
          gk_gioco_aereo: number | null
          gk_lancio: number | null
          gk_presa: number | null
          gk_riflessi: number | null
          gk_rinvio: number | null
          gk_tendenza_pugni: number | null
          gk_tendenza_uscire: number | null
          gk_uno_vs_uno: number | null
          id: string
          influenza_neg_allenatore: boolean
          influenza_neg_arbitro: boolean
          influenza_neg_errore_compagno: boolean
          influenza_neg_propri_errori: boolean
          influenza_neg_risultato: boolean
          men_aggressivita: number | null
          men_carisma: number | null
          men_concentrazione: number | null
          men_coraggio: number | null
          men_decisioni: number | null
          men_determinazione: number | null
          men_fantasia: number | null
          men_freddezza: number | null
          men_gioco_squadra: number | null
          men_impegno: number | null
          men_intuito: number | null
          men_posizione: number | null
          men_senza_palla: number | null
          men_visione: number | null
          muscolatura: Database["public"]["Enums"]["muscolatura_enum"] | null
          nazionalita: string | null
          nome: string
          note_rapide: string | null
          passaporto: Database["public"]["Enums"]["passaporto_enum"] | null
          peso_kg: number | null
          piede: Database["public"]["Enums"]["piede_enum"] | null
          ruoli_secondari: Database["public"]["Enums"]["ruolo_enum"][]
          ruolo_principale: Database["public"]["Enums"]["ruolo_enum"] | null
          scadenza_contratto: string | null
          scout_assegnato: string | null
          scouting_report_url: string | null
          squadra_attuale: string | null
          status_osservazione: Database["public"]["Enums"]["status_osservazione_enum"]
          stili_gioco: string[]
          struttura_corporea:
            | Database["public"]["Enums"]["struttura_corporea_enum"]
            | null
          tec_calci_angolo: number | null
          tec_colpi_testa: number | null
          tec_contrasti: number | null
          tec_controllo_palla: number | null
          tec_cross: number | null
          tec_dribbling: number | null
          tec_finalizzazione: number | null
          tec_marcatura: number | null
          tec_passaggi: number | null
          tec_punizioni: number | null
          tec_rigori: number | null
          tec_rimesse_lunghe: number | null
          tec_tecnica: number | null
          tec_tiri_lontano: number | null
          transfermarkt_url: string | null
          updated_at: string
          valore_mercato_eur: number | null
          voto_potenziale:
            | Database["public"]["Enums"]["voto_potenziale_enum"]
            | null
          workspace_id: string
        }
        Insert: {
          agenzia?: string | null
          altezza_cm?: number | null
          behav_assume_responsabilita?:
            | Database["public"]["Enums"]["si_no_avolte_enum"]
            | null
          behav_delega_altri?:
            | Database["public"]["Enums"]["si_no_avolte_enum"]
            | null
          campionato?: string | null
          capacita_condizionali?: string | null
          clip_video_urls?: string[]
          cognome: string
          created_at?: string
          created_by: string
          data_nascita?: string | null
          data_ultimo_aggiornamento?: string
          deleted_at?: string | null
          fascia_ingaggio?:
            | Database["public"]["Enums"]["fascia_ingaggio_enum"]
            | null
          fis_accelerazione?: number | null
          fis_agilita?: number | null
          fis_elevazione?: number | null
          fis_equilibrio?: number | null
          fis_forza?: number | null
          fis_integrita?: number | null
          fis_resistenza?: number | null
          fis_velocita?: number | null
          foto_url?: string | null
          gesti_motori?: Database["public"]["Enums"]["gesti_motori_enum"] | null
          gk_comando_area?: number | null
          gk_comunicazione?: number | null
          gk_eccentricita?: number | null
          gk_gioco_aereo?: number | null
          gk_lancio?: number | null
          gk_presa?: number | null
          gk_riflessi?: number | null
          gk_rinvio?: number | null
          gk_tendenza_pugni?: number | null
          gk_tendenza_uscire?: number | null
          gk_uno_vs_uno?: number | null
          id?: string
          influenza_neg_allenatore?: boolean
          influenza_neg_arbitro?: boolean
          influenza_neg_errore_compagno?: boolean
          influenza_neg_propri_errori?: boolean
          influenza_neg_risultato?: boolean
          men_aggressivita?: number | null
          men_carisma?: number | null
          men_concentrazione?: number | null
          men_coraggio?: number | null
          men_decisioni?: number | null
          men_determinazione?: number | null
          men_fantasia?: number | null
          men_freddezza?: number | null
          men_gioco_squadra?: number | null
          men_impegno?: number | null
          men_intuito?: number | null
          men_posizione?: number | null
          men_senza_palla?: number | null
          men_visione?: number | null
          muscolatura?: Database["public"]["Enums"]["muscolatura_enum"] | null
          nazionalita?: string | null
          nome: string
          note_rapide?: string | null
          passaporto?: Database["public"]["Enums"]["passaporto_enum"] | null
          peso_kg?: number | null
          piede?: Database["public"]["Enums"]["piede_enum"] | null
          ruoli_secondari?: Database["public"]["Enums"]["ruolo_enum"][]
          ruolo_principale?: Database["public"]["Enums"]["ruolo_enum"] | null
          scadenza_contratto?: string | null
          scout_assegnato?: string | null
          scouting_report_url?: string | null
          squadra_attuale?: string | null
          status_osservazione?: Database["public"]["Enums"]["status_osservazione_enum"]
          stili_gioco?: string[]
          struttura_corporea?:
            | Database["public"]["Enums"]["struttura_corporea_enum"]
            | null
          tec_calci_angolo?: number | null
          tec_colpi_testa?: number | null
          tec_contrasti?: number | null
          tec_controllo_palla?: number | null
          tec_cross?: number | null
          tec_dribbling?: number | null
          tec_finalizzazione?: number | null
          tec_marcatura?: number | null
          tec_passaggi?: number | null
          tec_punizioni?: number | null
          tec_rigori?: number | null
          tec_rimesse_lunghe?: number | null
          tec_tecnica?: number | null
          tec_tiri_lontano?: number | null
          transfermarkt_url?: string | null
          updated_at?: string
          valore_mercato_eur?: number | null
          voto_potenziale?:
            | Database["public"]["Enums"]["voto_potenziale_enum"]
            | null
          workspace_id: string
        }
        Update: {
          agenzia?: string | null
          altezza_cm?: number | null
          behav_assume_responsabilita?:
            | Database["public"]["Enums"]["si_no_avolte_enum"]
            | null
          behav_delega_altri?:
            | Database["public"]["Enums"]["si_no_avolte_enum"]
            | null
          campionato?: string | null
          capacita_condizionali?: string | null
          clip_video_urls?: string[]
          cognome?: string
          created_at?: string
          created_by?: string
          data_nascita?: string | null
          data_ultimo_aggiornamento?: string
          deleted_at?: string | null
          fascia_ingaggio?:
            | Database["public"]["Enums"]["fascia_ingaggio_enum"]
            | null
          fis_accelerazione?: number | null
          fis_agilita?: number | null
          fis_elevazione?: number | null
          fis_equilibrio?: number | null
          fis_forza?: number | null
          fis_integrita?: number | null
          fis_resistenza?: number | null
          fis_velocita?: number | null
          foto_url?: string | null
          gesti_motori?: Database["public"]["Enums"]["gesti_motori_enum"] | null
          gk_comando_area?: number | null
          gk_comunicazione?: number | null
          gk_eccentricita?: number | null
          gk_gioco_aereo?: number | null
          gk_lancio?: number | null
          gk_presa?: number | null
          gk_riflessi?: number | null
          gk_rinvio?: number | null
          gk_tendenza_pugni?: number | null
          gk_tendenza_uscire?: number | null
          gk_uno_vs_uno?: number | null
          id?: string
          influenza_neg_allenatore?: boolean
          influenza_neg_arbitro?: boolean
          influenza_neg_errore_compagno?: boolean
          influenza_neg_propri_errori?: boolean
          influenza_neg_risultato?: boolean
          men_aggressivita?: number | null
          men_carisma?: number | null
          men_concentrazione?: number | null
          men_coraggio?: number | null
          men_decisioni?: number | null
          men_determinazione?: number | null
          men_fantasia?: number | null
          men_freddezza?: number | null
          men_gioco_squadra?: number | null
          men_impegno?: number | null
          men_intuito?: number | null
          men_posizione?: number | null
          men_senza_palla?: number | null
          men_visione?: number | null
          muscolatura?: Database["public"]["Enums"]["muscolatura_enum"] | null
          nazionalita?: string | null
          nome?: string
          note_rapide?: string | null
          passaporto?: Database["public"]["Enums"]["passaporto_enum"] | null
          peso_kg?: number | null
          piede?: Database["public"]["Enums"]["piede_enum"] | null
          ruoli_secondari?: Database["public"]["Enums"]["ruolo_enum"][]
          ruolo_principale?: Database["public"]["Enums"]["ruolo_enum"] | null
          scadenza_contratto?: string | null
          scout_assegnato?: string | null
          scouting_report_url?: string | null
          squadra_attuale?: string | null
          status_osservazione?: Database["public"]["Enums"]["status_osservazione_enum"]
          stili_gioco?: string[]
          struttura_corporea?:
            | Database["public"]["Enums"]["struttura_corporea_enum"]
            | null
          tec_calci_angolo?: number | null
          tec_colpi_testa?: number | null
          tec_contrasti?: number | null
          tec_controllo_palla?: number | null
          tec_cross?: number | null
          tec_dribbling?: number | null
          tec_finalizzazione?: number | null
          tec_marcatura?: number | null
          tec_passaggi?: number | null
          tec_punizioni?: number | null
          tec_rigori?: number | null
          tec_rimesse_lunghe?: number | null
          tec_tecnica?: number | null
          tec_tiri_lontano?: number | null
          transfermarkt_url?: string | null
          updated_at?: string
          valore_mercato_eur?: number | null
          voto_potenziale?:
            | Database["public"]["Enums"]["voto_potenziale_enum"]
            | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          label: string
          start_date: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          label: string
          start_date?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          label?: string
          start_date?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      set_pieces: {
        Row: {
          altezza_linea_difensiva:
            | Database["public"]["Enums"]["sp_altezza_linea_enum"]
            | null
          behavior_tags: string[]
          competizione: string | null
          created_at: string
          created_by: string
          data_evento: string | null
          deleted_at: string | null
          esito_finale:
            | Database["public"]["Enums"]["sp_esito_finale_enum"]
            | null
          fase: Database["public"]["Enums"]["sp_fase_enum"]
          giocatori_in_area: number | null
          giocatori_in_transizione: number | null
          id: string
          landing_zones: string[]
          lato_battuta:
            | Database["public"]["Enums"]["sp_lato_battuta_enum"]
            | null
          lavagna_image_url: string | null
          minuto: number | null
          note_esito: string | null
          pdf_url: string | null
          piede_battitore:
            | Database["public"]["Enums"]["sp_piede_battitore_enum"]
            | null
          punteggio: string | null
          sistema_marcatura:
            | Database["public"]["Enums"]["sp_sistema_marcatura_enum"]
            | null
          specificazione_punizione:
            | Database["public"]["Enums"]["sp_specificazione_punizione_enum"]
            | null
          squadra_avversaria: string | null
          squadra_esecutrice: string | null
          stagione: string | null
          sviluppo_schema:
            | Database["public"]["Enums"]["sp_sviluppo_schema_enum"]
            | null
          tipo_piazzato: Database["public"]["Enums"]["sp_tipo_piazzato_enum"]
          titolo: string
          traiettoria: Database["public"]["Enums"]["sp_traiettoria_enum"] | null
          uomini_in_barriera: number | null
          uomini_sui_pali:
            | Database["public"]["Enums"]["sp_uomini_sui_pali_enum"]
            | null
          updated_at: string
          video_url: string | null
          workspace_id: string
        }
        Insert: {
          altezza_linea_difensiva?:
            | Database["public"]["Enums"]["sp_altezza_linea_enum"]
            | null
          behavior_tags?: string[]
          competizione?: string | null
          created_at?: string
          created_by: string
          data_evento?: string | null
          deleted_at?: string | null
          esito_finale?:
            | Database["public"]["Enums"]["sp_esito_finale_enum"]
            | null
          fase: Database["public"]["Enums"]["sp_fase_enum"]
          giocatori_in_area?: number | null
          giocatori_in_transizione?: number | null
          id?: string
          landing_zones?: string[]
          lato_battuta?:
            | Database["public"]["Enums"]["sp_lato_battuta_enum"]
            | null
          lavagna_image_url?: string | null
          minuto?: number | null
          note_esito?: string | null
          pdf_url?: string | null
          piede_battitore?:
            | Database["public"]["Enums"]["sp_piede_battitore_enum"]
            | null
          punteggio?: string | null
          sistema_marcatura?:
            | Database["public"]["Enums"]["sp_sistema_marcatura_enum"]
            | null
          specificazione_punizione?:
            | Database["public"]["Enums"]["sp_specificazione_punizione_enum"]
            | null
          squadra_avversaria?: string | null
          squadra_esecutrice?: string | null
          stagione?: string | null
          sviluppo_schema?:
            | Database["public"]["Enums"]["sp_sviluppo_schema_enum"]
            | null
          tipo_piazzato: Database["public"]["Enums"]["sp_tipo_piazzato_enum"]
          titolo: string
          traiettoria?:
            | Database["public"]["Enums"]["sp_traiettoria_enum"]
            | null
          uomini_in_barriera?: number | null
          uomini_sui_pali?:
            | Database["public"]["Enums"]["sp_uomini_sui_pali_enum"]
            | null
          updated_at?: string
          video_url?: string | null
          workspace_id: string
        }
        Update: {
          altezza_linea_difensiva?:
            | Database["public"]["Enums"]["sp_altezza_linea_enum"]
            | null
          behavior_tags?: string[]
          competizione?: string | null
          created_at?: string
          created_by?: string
          data_evento?: string | null
          deleted_at?: string | null
          esito_finale?:
            | Database["public"]["Enums"]["sp_esito_finale_enum"]
            | null
          fase?: Database["public"]["Enums"]["sp_fase_enum"]
          giocatori_in_area?: number | null
          giocatori_in_transizione?: number | null
          id?: string
          landing_zones?: string[]
          lato_battuta?:
            | Database["public"]["Enums"]["sp_lato_battuta_enum"]
            | null
          lavagna_image_url?: string | null
          minuto?: number | null
          note_esito?: string | null
          pdf_url?: string | null
          piede_battitore?:
            | Database["public"]["Enums"]["sp_piede_battitore_enum"]
            | null
          punteggio?: string | null
          sistema_marcatura?:
            | Database["public"]["Enums"]["sp_sistema_marcatura_enum"]
            | null
          specificazione_punizione?:
            | Database["public"]["Enums"]["sp_specificazione_punizione_enum"]
            | null
          squadra_avversaria?: string | null
          squadra_esecutrice?: string | null
          stagione?: string | null
          sviluppo_schema?:
            | Database["public"]["Enums"]["sp_sviluppo_schema_enum"]
            | null
          tipo_piazzato?: Database["public"]["Enums"]["sp_tipo_piazzato_enum"]
          titolo?: string
          traiettoria?:
            | Database["public"]["Enums"]["sp_traiettoria_enum"]
            | null
          uomini_in_barriera?: number | null
          uomini_sui_pali?:
            | Database["public"]["Enums"]["sp_uomini_sui_pali_enum"]
            | null
          updated_at?: string
          video_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_pieces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_pieces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      situational_tactics: {
        Row: {
          autori: string[]
          created_at: string
          created_by: string
          deleted_at: string | null
          descrizione_flusso: string | null
          focus_tags: string[]
          id: string
          lavagna_url: string | null
          macro_fase: Database["public"]["Enums"]["st_macro_fase_enum"]
          numero_giocatori: string[]
          pdf_url: string | null
          regole_provocazione: string | null
          sotto_fase: Database["public"]["Enums"]["st_sotto_fase_enum"]
          spazio_dimensioni: string | null
          titolo: string
          updated_at: string
          varianti: string | null
          video_url: string | null
          workspace_id: string
        }
        Insert: {
          autori?: string[]
          created_at?: string
          created_by: string
          deleted_at?: string | null
          descrizione_flusso?: string | null
          focus_tags?: string[]
          id?: string
          lavagna_url?: string | null
          macro_fase: Database["public"]["Enums"]["st_macro_fase_enum"]
          numero_giocatori?: string[]
          pdf_url?: string | null
          regole_provocazione?: string | null
          sotto_fase: Database["public"]["Enums"]["st_sotto_fase_enum"]
          spazio_dimensioni?: string | null
          titolo: string
          updated_at?: string
          varianti?: string | null
          video_url?: string | null
          workspace_id: string
        }
        Update: {
          autori?: string[]
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          descrizione_flusso?: string | null
          focus_tags?: string[]
          id?: string
          lavagna_url?: string | null
          macro_fase?: Database["public"]["Enums"]["st_macro_fase_enum"]
          numero_giocatori?: string[]
          pdf_url?: string | null
          regole_provocazione?: string | null
          sotto_fase?: Database["public"]["Enums"]["st_sotto_fase_enum"]
          spazio_dimensioni?: string | null
          titolo?: string
          updated_at?: string
          varianti?: string | null
          video_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "situational_tactics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "situational_tactics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          lega: string | null
          logo_url: string | null
          nome: string
          paese: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lega?: string | null
          logo_url?: string | null
          nome: string
          paese?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lega?: string | null
          logo_url?: string | null
          nome?: string
          paese?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          accepted_at: string | null
          email_invitata: string
          id: string
          invited_at: string
          role: Database["public"]["Enums"]["membership_role_enum"]
          status: Database["public"]["Enums"]["membership_status_enum"]
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          email_invitata: string
          id?: string
          invited_at?: string
          role: Database["public"]["Enums"]["membership_role_enum"]
          status?: Database["public"]["Enums"]["membership_status_enum"]
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          email_invitata?: string
          id?: string
          invited_at?: string
          role?: Database["public"]["Enums"]["membership_role_enum"]
          status?: Database["public"]["Enums"]["membership_status_enum"]
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          nome: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_owned_workspaces: { Args: never; Returns: string[] }
      current_user_workspaces: { Args: never; Returns: string[] }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      ambito_enum: "PRIMA_SQUADRA" | "SETTORE_GIOVANILE" | "CALCIO_FEMMINILE"
      categoria_lavoro_enum:
        | "TEAM_STUDIO"
        | "MATCH_STUDIO"
        | "INDIVIDUAL_ANALYSIS"
        | "DATA_ANALYSIS"
        | "ALLENAMENTO"
      fascia_ingaggio_enum:
        | "SOTTO_100K"
        | "TRA_100K_300K"
        | "TRA_300K_600K"
        | "TRA_600K_1M"
        | "SOPRA_1M"
      gesti_motori_enum:
        | "CLASSE"
        | "STILE"
        | "NORMALE"
        | "SGRAZIATO"
        | "ELEGANTE"
      membership_role_enum: "OWNER" | "COLLABORATOR"
      membership_status_enum: "PENDING" | "ACTIVE" | "REVOKED"
      muscolatura_enum: "SCARNA" | "NORMALE" | "EVIDENZIATA" | "MASSICCIA"
      passaporto_enum: "COMUNITARIO" | "EXTRACOMUNITARIO"
      piede_enum: "DESTRO" | "SINISTRO" | "AMBIDESTRO"
      ruolo_enum:
        | "POR"
        | "DC"
        | "DLS"
        | "DLD"
        | "DES"
        | "DED"
        | "CDC"
        | "CC"
        | "CED"
        | "CES"
        | "COC"
        | "COD"
        | "COS"
        | "AED"
        | "AES"
        | "SP"
        | "AC"
      si_no_avolte_enum: "SI" | "NO" | "A_VOLTE"
      sorgente_video_enum:
        | "TELECAMERA_TATTICA"
        | "BROADCASTER_TV"
        | "WYSCOUT"
        | "DRONE"
      sp_altezza_linea_enum: "ALTA" | "PROFONDA" | "ELASTICA"
      sp_esito_finale_enum:
        | "GOL"
        | "TIRO_IN_PORTA"
        | "TIRO_FUORI"
        | "LIBERATO_DIFESA"
        | "FALLO_COMMESSO"
        | "FALLO_SUBITO"
        | "FUORIGIOCO"
        | "TRANSIZIONE_SUBITA"
      sp_fase_enum: "OFFENSIVO" | "DIFENSIVO"
      sp_lato_battuta_enum: "DESTRO" | "SINISTRO" | "CENTRALE"
      sp_piede_battitore_enum: "DESTRO" | "SINISTRO" | "DUE_SULLA_PALLA"
      sp_sistema_marcatura_enum: "A_UOMO" | "A_ZONA" | "MISTA"
      sp_specificazione_punizione_enum: "CENTRALE" | "LATERALE"
      sp_sviluppo_schema_enum:
        | "DIRETTO"
        | "CORTO_2_3_TOCCHI"
        | "SCARICO_FUORI_AREA"
      sp_tipo_piazzato_enum:
        | "ANGOLO"
        | "PUNIZIONE"
        | "RIMESSA_LATERALE"
        | "RIGORE"
      sp_traiettoria_enum:
        | "A_RIENTRARE"
        | "A_USCIRE"
        | "TESA"
        | "MORBIDA"
        | "RASOTERRA"
      sp_uomini_sui_pali_enum:
        | "NESSUNO"
        | "PRIMO_PALO"
        | "SECONDO_PALO"
        | "ENTRAMBI"
      st_macro_fase_enum:
        | "POSSESSO"
        | "NON_POSSESSO"
        | "TRANSIZIONE_POSITIVA"
        | "TRANSIZIONE_NEGATIVA"
      st_sotto_fase_enum:
        | "COSTRUZIONE_BASSA"
        | "SVILUPPO_CONSOLIDAMENTO"
        | "RIFINITURA_FINALIZZAZIONE"
        | "PRESSIONE_ALTA"
        | "BLOCCO_MEDIO"
        | "BLOCCO_BASSO"
        | "CONSOLIDAMENTO_POSSESSO"
        | "CONTROPIEDE_ATTACCO_DIRETTO"
        | "RIACQUISTO_IMMEDIATO"
        | "RIORGANIZZAZIONE_SCAPPARE"
      status_osservazione_enum:
        | "DA_VISIONARE"
        | "IN_OSSERVAZIONE"
        | "APPROVATO"
        | "RIFIUTATO"
      struttura_corporea_enum:
        | "ATLETICO"
        | "ROBUSTO"
        | "LONGILINEO"
        | "MASSICCIO"
        | "NORMOTIPO"
        | "BREVILINEO"
      tipo_media_enum:
        | "VIDEO_CLIP"
        | "INTERA_PARTITA"
        | "PDF_REPORT"
        | "SLIDE_PRESENTAZIONE"
        | "EXCEL_DATI"
      voto_potenziale_enum: "A1" | "A2" | "B1" | "B2" | "C" | "D"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ambito_enum: ["PRIMA_SQUADRA", "SETTORE_GIOVANILE", "CALCIO_FEMMINILE"],
      categoria_lavoro_enum: [
        "TEAM_STUDIO",
        "MATCH_STUDIO",
        "INDIVIDUAL_ANALYSIS",
        "DATA_ANALYSIS",
        "ALLENAMENTO",
      ],
      fascia_ingaggio_enum: [
        "SOTTO_100K",
        "TRA_100K_300K",
        "TRA_300K_600K",
        "TRA_600K_1M",
        "SOPRA_1M",
      ],
      gesti_motori_enum: [
        "CLASSE",
        "STILE",
        "NORMALE",
        "SGRAZIATO",
        "ELEGANTE",
      ],
      membership_role_enum: ["OWNER", "COLLABORATOR"],
      membership_status_enum: ["PENDING", "ACTIVE", "REVOKED"],
      muscolatura_enum: ["SCARNA", "NORMALE", "EVIDENZIATA", "MASSICCIA"],
      passaporto_enum: ["COMUNITARIO", "EXTRACOMUNITARIO"],
      piede_enum: ["DESTRO", "SINISTRO", "AMBIDESTRO"],
      ruolo_enum: [
        "POR",
        "DC",
        "DLS",
        "DLD",
        "DES",
        "DED",
        "CDC",
        "CC",
        "CED",
        "CES",
        "COC",
        "COD",
        "COS",
        "AED",
        "AES",
        "SP",
        "AC",
      ],
      si_no_avolte_enum: ["SI", "NO", "A_VOLTE"],
      sorgente_video_enum: [
        "TELECAMERA_TATTICA",
        "BROADCASTER_TV",
        "WYSCOUT",
        "DRONE",
      ],
      sp_altezza_linea_enum: ["ALTA", "PROFONDA", "ELASTICA"],
      sp_esito_finale_enum: [
        "GOL",
        "TIRO_IN_PORTA",
        "TIRO_FUORI",
        "LIBERATO_DIFESA",
        "FALLO_COMMESSO",
        "FALLO_SUBITO",
        "FUORIGIOCO",
        "TRANSIZIONE_SUBITA",
      ],
      sp_fase_enum: ["OFFENSIVO", "DIFENSIVO"],
      sp_lato_battuta_enum: ["DESTRO", "SINISTRO", "CENTRALE"],
      sp_piede_battitore_enum: ["DESTRO", "SINISTRO", "DUE_SULLA_PALLA"],
      sp_sistema_marcatura_enum: ["A_UOMO", "A_ZONA", "MISTA"],
      sp_specificazione_punizione_enum: ["CENTRALE", "LATERALE"],
      sp_sviluppo_schema_enum: [
        "DIRETTO",
        "CORTO_2_3_TOCCHI",
        "SCARICO_FUORI_AREA",
      ],
      sp_tipo_piazzato_enum: [
        "ANGOLO",
        "PUNIZIONE",
        "RIMESSA_LATERALE",
        "RIGORE",
      ],
      sp_traiettoria_enum: [
        "A_RIENTRARE",
        "A_USCIRE",
        "TESA",
        "MORBIDA",
        "RASOTERRA",
      ],
      sp_uomini_sui_pali_enum: [
        "NESSUNO",
        "PRIMO_PALO",
        "SECONDO_PALO",
        "ENTRAMBI",
      ],
      st_macro_fase_enum: [
        "POSSESSO",
        "NON_POSSESSO",
        "TRANSIZIONE_POSITIVA",
        "TRANSIZIONE_NEGATIVA",
      ],
      st_sotto_fase_enum: [
        "COSTRUZIONE_BASSA",
        "SVILUPPO_CONSOLIDAMENTO",
        "RIFINITURA_FINALIZZAZIONE",
        "PRESSIONE_ALTA",
        "BLOCCO_MEDIO",
        "BLOCCO_BASSO",
        "CONSOLIDAMENTO_POSSESSO",
        "CONTROPIEDE_ATTACCO_DIRETTO",
        "RIACQUISTO_IMMEDIATO",
        "RIORGANIZZAZIONE_SCAPPARE",
      ],
      status_osservazione_enum: [
        "DA_VISIONARE",
        "IN_OSSERVAZIONE",
        "APPROVATO",
        "RIFIUTATO",
      ],
      struttura_corporea_enum: [
        "ATLETICO",
        "ROBUSTO",
        "LONGILINEO",
        "MASSICCIO",
        "NORMOTIPO",
        "BREVILINEO",
      ],
      tipo_media_enum: [
        "VIDEO_CLIP",
        "INTERA_PARTITA",
        "PDF_REPORT",
        "SLIDE_PRESENTAZIONE",
        "EXCEL_DATI",
      ],
      voto_potenziale_enum: ["A1", "A2", "B1", "B2", "C", "D"],
    },
  },
} as const
