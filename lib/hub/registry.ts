/**
 * Registro delle sezioni personali (Studi, Benessere, Finanze).
 * Ogni sezione è descritta una volta sola: tabella, campi, filtri, modelli.
 * Da qui nascono liste, viste, moduli, cestino, ricerca e collegamenti.
 */
import type { FieldDef, Option } from "./fields";

export type AreaKey = "studi" | "benessere" | "finanze";
export type ViewKind = "table" | "list" | "cards";

export type ChildDef = {
  /** Chiave di una sezione (controllata da registry.test.mjs). */
  collection: string;
  /** Non mostrata come elenco generico: la pagina di dettaglio la disegna a modo suo. */
  hidden?: boolean;
  /** Colonna della tabella figlia che punta al genitore. */
  parentField: string;
  label: string;
};

export type Template = { label: string; values: Record<string, unknown> };

export type CollectionDef = {
  key: string;
  area: AreaKey;
  table: string;
  label: string;
  singular: string;
  /** Genere della parola (per "Nuovo/Nuova"). */
  feminine?: boolean;
  description: string;
  /** Segmento dell'indirizzo (/studi/libri). Assente = sezione figlia senza pagina propria. */
  slug?: string;
  titleField: string;
  subtitleFields?: string[];
  fields: FieldDef[];
  sort: { field: string; asc: boolean }[];
  filters?: string[];
  defaultView?: ViewKind;
  /** Ha la colonna deleted_at: va nel cestino invece di sparire. */
  trash: boolean;
  children?: ChildDef[];
  /** Ha completato_il + ripassi: compare in "Da ripassare". */
  reviewable?: boolean;
  templates?: Template[];
  /** Campi in cui cerca ⌘K oltre al titolo. */
  searchFields?: string[];
  /** Badge di stato colorato nelle liste. */
  statusField?: string;
  /** Le voci hanno un campo "ordine" e si possono spostare su e giù. */
  reorderable?: boolean;
};

const opts = (...pairs: [string, string][]): Option[] => pairs.map(([value, label]) => ({ value, label }));

/* ------------------------------------------------------------------ */
/* Opzioni condivise                                                   */
/* ------------------------------------------------------------------ */

export const METRIC_TYPES = opts(
  ["peso", "Peso"],
  ["battito_riposo", "Battito a riposo"],
  ["sonno_ore", "Sonno"],
  ["passi", "Passi"],
  ["stress", "Stress"],
  ["calorie_attive", "Calorie attive"],
  ["grasso_corporeo", "Grasso corporeo"],
  ["spo2", "Ossigeno nel sangue"],
  ["hrv", "Variabilità del battito (HRV)"],
  ["pressione_max", "Pressione massima"],
  ["pressione_min", "Pressione minima"],
);

export const METRIC_UNIT: Record<string, string> = {
  peso: "kg",
  battito_riposo: "bpm",
  sonno_ore: "ore",
  passi: "passi",
  stress: "/100",
  calorie_attive: "kcal",
  grasso_corporeo: "%",
  spo2: "%",
  hrv: "ms",
  pressione_max: "mmHg",
  pressione_min: "mmHg",
};

export const MEALS = opts(["colazione", "Colazione"], ["pranzo", "Pranzo"], ["cena", "Cena"], ["spuntino", "Spuntino"]);

const TAGS: FieldDef = { key: "tags", label: "Tag", type: "tags", wide: true };
const NOTE: FieldDef = { key: "note", label: "Note", type: "longtext", wide: true };
const RIASSUNTO: FieldDef = { key: "riassunto", label: "Riassunto", type: "longtext", wide: true };
const COMPLETATO: FieldDef = {
  key: "completato_il",
  label: "Completato il",
  type: "date",
  help: "Da questa data partono i ripassi: dopo 1 giorno, 1 settimana e 1 mese.",
};
const RIPASSI: FieldDef = { key: "ripassi", label: "Ripassi fatti", type: "integer", min: 0, max: 3, readOnly: true };

/* ------------------------------------------------------------------ */
/* Sezioni                                                             */
/* ------------------------------------------------------------------ */

const DEFS = {
  /* ============================ STUDI ============================ */
  books: {
    area: "studi",
    table: "study_books",
    slug: "libri",
    label: "Libri",
    singular: "libro",
    description: "Libri letti e da leggere, con capitoli, highlights e ripassi.",
    titleField: "titolo",
    subtitleFields: ["autore"],
    statusField: "stato",
    defaultView: "cards",
    trash: true,
    fields: [
      { key: "titolo", label: "Titolo", type: "text", required: true, max: 300, inTable: true, wide: true },
      { key: "autore", label: "Autore", type: "text", max: 200, inTable: true },
      {
        key: "stato",
        label: "Stato",
        type: "select",
        required: true,
        defaultValue: "da_leggere",
        inTable: true,
        options: opts(["da_leggere", "Da leggere"], ["in_lettura", "In lettura"], ["finito", "Finito"], ["abbandonato", "Abbandonato"]),
      },
      { key: "data_inizio", label: "Iniziato il", type: "date" },
      { key: "data_fine", label: "Finito il", type: "date", inTable: true },
      { key: "voto", label: "Voto", type: "rating", inTable: true },
      { key: "pagine", label: "Pagine", type: "integer", min: 1, max: 20000 },
      { key: "genere", label: "Genere", type: "text", max: 100 },
      { key: "link", label: "Link (scheda, ebook, acquisto)", type: "url", wide: true },
      RIASSUNTO,
      NOTE,
      TAGS,
    ],
    sort: [{ field: "updated_at", asc: false }],
    filters: ["stato", "voto", "tags"],
    searchFields: ["autore", "riassunto", "note"],
    children: [
      { collection: "chapters", parentField: "book_id", label: "Capitoli" },
      { collection: "highlights", parentField: "book_id", label: "Highlights" },
    ],
    templates: [
      { label: "Libro da leggere", values: { stato: "da_leggere" } },
      { label: "Inizio a leggerlo oggi", values: { stato: "in_lettura", data_inizio: "today" } },
    ],
  },
  chapters: {
    area: "studi",
    table: "study_book_chapters",
    label: "Capitoli",
    singular: "capitolo",
    description: "Capitoli di un libro.",
    titleField: "titolo",
    reviewable: true,
    trash: false,
    fields: [
      { key: "numero", label: "N.", type: "integer", min: 0, max: 999, inTable: true },
      { key: "titolo", label: "Titolo", type: "text", required: true, max: 300, inTable: true },
      { key: "riassunto", label: "In una frase", type: "longtext", max: 2000, wide: true, inTable: true },
      { key: "cosa_usero", label: "Una cosa che userò", type: "longtext", max: 2000, wide: true, inTable: true },
      COMPLETATO,
      RIPASSI,
      NOTE,
    ],
    sort: [{ field: "numero", asc: true }, { field: "created_at", asc: true }],
  },
  highlights: {
    area: "studi",
    table: "study_highlights",
    label: "Highlights",
    singular: "highlight",
    description: "Citazioni e passaggi importanti.",
    titleField: "testo",
    reviewable: true,
    trash: false,
    fields: [
      { key: "testo", label: "Citazione o passaggio", type: "longtext", required: true, max: 5000, wide: true, inTable: true },
      { key: "pagina", label: "Pagina", type: "text", max: 20, inTable: true },
      { key: "nota", label: "Perché è importante", type: "longtext", max: 2000, wide: true },
      { ...COMPLETATO, label: "Ripassi a partire da", defaultValue: "today" },
      RIPASSI,
      TAGS,
    ],
    sort: [{ field: "created_at", asc: true }],
  },
  courses: {
    area: "studi",
    table: "study_courses",
    slug: "corsi",
    label: "Corsi e università",
    singular: "corso",
    description: "Corsi, esami universitari e licenze, con lezioni e domande d'esame.",
    titleField: "titolo",
    subtitleFields: ["ente"],
    statusField: "stato",
    defaultView: "cards",
    trash: true,
    fields: [
      { key: "titolo", label: "Nome del corso", type: "text", required: true, max: 300, inTable: true, wide: true },
      { key: "ente", label: "Ente o università", type: "text", max: 200, inTable: true },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        required: true,
        defaultValue: "corso",
        inTable: true,
        options: opts(["universita", "Università"], ["corso", "Corso"], ["licenza", "Licenza / abilitazione"], ["altro", "Altro"]),
      },
      {
        key: "stato",
        label: "Stato",
        type: "select",
        required: true,
        defaultValue: "in_corso",
        inTable: true,
        options: opts(["da_iniziare", "Da iniziare"], ["in_corso", "In corso"], ["completato", "Completato"], ["sospeso", "Sospeso"]),
      },
      { key: "data_inizio", label: "Inizio", type: "date" },
      { key: "data_fine", label: "Fine", type: "date" },
      { key: "piattaforma_url", label: "Piattaforma del corso", type: "url", wide: true, help: "Solo il link: i file restano sulla piattaforma." },
      RIASSUNTO,
      NOTE,
      TAGS,
    ],
    sort: [{ field: "updated_at", asc: false }],
    filters: ["stato", "tipo", "tags"],
    searchFields: ["ente", "riassunto", "note"],
    children: [
      { collection: "modules", parentField: "course_id", label: "Lezioni e moduli" },
      { collection: "questions", parentField: "course_id", label: "Domande probabili d'esame" },
      { collection: "highlights", parentField: "course_id", label: "Highlights" },
    ],
    templates: [
      { label: "Esame universitario", values: { tipo: "universita", stato: "in_corso" } },
      { label: "Corso FIGC / licenza", values: { tipo: "licenza", ente: "FIGC – Settore Tecnico", stato: "in_corso" } },
    ],
  },
  modules: {
    area: "studi",
    table: "study_course_modules",
    label: "Lezioni e moduli",
    singular: "lezione",
    feminine: true,
    description: "Lezioni di un corso.",
    titleField: "titolo",
    reviewable: true,
    trash: false,
    fields: [
      { key: "ordine", label: "N.", type: "integer", min: 0, max: 999, inTable: true },
      { key: "titolo", label: "Titolo", type: "text", required: true, max: 300, inTable: true },
      {
        key: "stato",
        label: "Stato",
        type: "select",
        required: true,
        defaultValue: "da_fare",
        inTable: true,
        options: opts(["da_fare", "Da fare"], ["in_corso", "In corso"], ["fatto", "Fatto"]),
      },
      { key: "data", label: "Data della lezione", type: "date" },
      { key: "link", label: "Link alla lezione", type: "url", wide: true },
      RIASSUNTO,
      COMPLETATO,
      RIPASSI,
      NOTE,
    ],
    sort: [{ field: "ordine", asc: true }, { field: "created_at", asc: true }],
  },
  questions: {
    area: "studi",
    table: "study_exam_questions",
    label: "Domande d'esame",
    singular: "domanda",
    feminine: true,
    description: "Domande probabili per l'esame.",
    titleField: "domanda",
    trash: false,
    fields: [
      { key: "domanda", label: "Domanda", type: "longtext", required: true, max: 2000, wide: true, inTable: true },
      { key: "risposta", label: "Risposta (traccia)", type: "longtext", wide: true },
      {
        key: "stato",
        label: "Preparazione",
        type: "select",
        required: true,
        defaultValue: "da_studiare",
        inTable: true,
        options: opts(["da_studiare", "Da studiare"], ["incerta", "Incerta"], ["sicura", "Sicura"]),
      },
    ],
    sort: [{ field: "created_at", asc: true }],
  },
  exams: {
    area: "studi",
    table: "study_exams",
    slug: "esami",
    label: "Esami e scadenze",
    singular: "esame o scadenza",
    description: "Esami, consegne e scadenze, con il conto alla rovescia in home.",
    titleField: "titolo",
    subtitleFields: ["data", "luogo"],
    statusField: "stato",
    defaultView: "list",
    trash: true,
    fields: [
      { key: "titolo", label: "Titolo", type: "text", required: true, max: 300, inTable: true, wide: true },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        required: true,
        defaultValue: "esame",
        inTable: true,
        options: opts(["esame", "Esame"], ["scadenza", "Scadenza"], ["consegna", "Consegna"], ["altro", "Altro"]),
      },
      { key: "data", label: "Data", type: "date", required: true, inTable: true },
      { key: "course_id", label: "Corso", type: "ref", ref: "courses", inTable: true },
      { key: "luogo", label: "Luogo o piattaforma", type: "text", max: 200 },
      {
        key: "stato",
        label: "Stato",
        type: "select",
        required: true,
        defaultValue: "in_programma",
        inTable: true,
        options: opts(["in_programma", "In programma"], ["superato", "Superato"], ["non_superato", "Non superato"], ["rinviato", "Rinviato"]),
      },
      { key: "voto", label: "Voto / esito", type: "text", max: 20 },
      NOTE,
      TAGS,
    ],
    sort: [{ field: "data", asc: true }],
    filters: ["tipo", "stato", "course_id", "tags"],
    searchFields: ["luogo", "note"],
  },
  readings: {
    area: "studi",
    table: "study_readings",
    slug: "letture",
    label: "Riviste e letture",
    singular: "lettura",
    feminine: true,
    description: "Riviste, articoli e letture brevi (es. Il Nuovo Calcio).",
    titleField: "titolo",
    subtitleFields: ["testata", "numero"],
    statusField: "stato",
    defaultView: "list",
    reviewable: true,
    trash: true,
    fields: [
      { key: "titolo", label: "Titolo", type: "text", required: true, max: 300, inTable: true, wide: true },
      { key: "testata", label: "Rivista o fonte", type: "text", max: 200, inTable: true },
      { key: "numero", label: "Numero", type: "text", max: 40 },
      { key: "data", label: "Data", type: "date", inTable: true },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        required: true,
        defaultValue: "rivista",
        options: opts(["rivista", "Rivista"], ["articolo", "Articolo"], ["dispensa", "Dispensa"], ["altro", "Altro"]),
      },
      {
        key: "stato",
        label: "Stato",
        type: "select",
        required: true,
        defaultValue: "da_leggere",
        inTable: true,
        options: opts(["da_leggere", "Da leggere"], ["letto", "Letto"]),
      },
      { key: "link", label: "Link", type: "url", wide: true },
      RIASSUNTO,
      COMPLETATO,
      RIPASSI,
      NOTE,
      TAGS,
    ],
    sort: [{ field: "data", asc: false }, { field: "created_at", asc: false }],
    filters: ["testata", "stato", "tags"],
    searchFields: ["testata", "riassunto", "note"],
    children: [{ collection: "highlights", parentField: "reading_id", label: "Highlights" }],
    templates: [{ label: "Il Nuovo Calcio – numero del mese", values: { testata: "Il Nuovo Calcio", tipo: "rivista", data: "today" } }],
  },

  /* =========================== FINANZE =========================== */
  transactions: {
    area: "finanze",
    table: "fin_transactions",
    slug: "movimenti",
    label: "Entrate e uscite",
    singular: "movimento",
    description: "Ogni entrata e uscita, con categoria e conto.",
    titleField: "descrizione",
    subtitleFields: ["data", "categoria_id"],
    defaultView: "table",
    trash: true,
    fields: [
      { key: "data", label: "Data", type: "date", required: true, defaultValue: "today", inTable: true },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        required: true,
        defaultValue: "uscita",
        inTable: true,
        options: opts(["uscita", "Uscita"], ["entrata", "Entrata"]),
      },
      { key: "importo_cent", label: "Importo", type: "money", required: true, min: 0.01, inTable: true, unit: "€" },
      { key: "descrizione", label: "Descrizione", type: "text", required: true, max: 300, inTable: true, wide: true },
      { key: "categoria_id", label: "Categoria", type: "ref", ref: "categories", inTable: true },
      { key: "conto_id", label: "Conto", type: "ref", ref: "accounts", inTable: true },
      NOTE,
      TAGS,
    ],
    sort: [{ field: "data", asc: false }, { field: "created_at", asc: false }],
    filters: ["tipo", "categoria_id", "conto_id", "tags"],
    searchFields: ["note"],
    templates: [
      { label: "Spesa di oggi", values: { tipo: "uscita", data: "today" } },
      { label: "Entrata (stipendio, rimborso)", values: { tipo: "entrata", data: "today" } },
    ],
  },
  recurring: {
    area: "finanze",
    table: "fin_recurring",
    slug: "ricorrenti",
    label: "Ricorrenti e abbonamenti",
    singular: "spesa ricorrente",
    feminine: true,
    description: "Abbonamenti e spese fisse, con la prossima scadenza.",
    titleField: "nome",
    subtitleFields: ["frequenza", "prossima_data"],
    defaultView: "list",
    trash: true,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, max: 200, inTable: true, wide: true },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        required: true,
        defaultValue: "uscita",
        options: opts(["uscita", "Uscita"], ["entrata", "Entrata"]),
      },
      { key: "importo_cent", label: "Importo", type: "money", required: true, min: 0.01, inTable: true },
      {
        key: "frequenza",
        label: "Ogni",
        type: "select",
        required: true,
        defaultValue: "mensile",
        inTable: true,
        options: opts(
          ["settimanale", "Settimana"],
          ["mensile", "Mese"],
          ["bimestrale", "2 mesi"],
          ["trimestrale", "3 mesi"],
          ["semestrale", "6 mesi"],
          ["annuale", "Anno"],
        ),
      },
      { key: "prossima_data", label: "Prossima scadenza", type: "date", required: true, defaultValue: "today", inTable: true },
      { key: "categoria_id", label: "Categoria", type: "ref", ref: "categories" },
      { key: "conto_id", label: "Conto", type: "ref", ref: "accounts" },
      { key: "abbonamento", label: "È un abbonamento", type: "boolean", defaultValue: true },
      { key: "attivo", label: "Attivo", type: "boolean", defaultValue: true, inTable: true },
      NOTE,
    ],
    sort: [{ field: "prossima_data", asc: true }],
    filters: ["frequenza", "attivo", "abbonamento"],
    searchFields: ["note"],
  },
  goals: {
    area: "finanze",
    table: "fin_goals",
    slug: "obiettivi",
    label: "Obiettivi di risparmio",
    singular: "obiettivo",
    description: "Quanto vuoi mettere da parte e a che punto sei.",
    titleField: "nome",
    subtitleFields: ["scadenza"],
    statusField: "stato",
    defaultView: "cards",
    trash: true,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, max: 200, inTable: true, wide: true },
      { key: "obiettivo_cent", label: "Obiettivo", type: "money", required: true, min: 0.01, inTable: true },
      { key: "accantonato_cent", label: "Già messo da parte", type: "money", min: 0, defaultValue: "0", inTable: true },
      { key: "scadenza", label: "Entro il", type: "date", inTable: true },
      {
        key: "stato",
        label: "Stato",
        type: "select",
        required: true,
        defaultValue: "attivo",
        inTable: true,
        options: opts(["attivo", "Attivo"], ["raggiunto", "Raggiunto"], ["sospeso", "Sospeso"]),
      },
      NOTE,
    ],
    sort: [{ field: "scadenza", asc: true }],
    filters: ["stato"],
  },
  accounts: {
    area: "finanze",
    table: "fin_accounts",
    slug: "conti",
    label: "Conti",
    singular: "conto",
    description: "Conti correnti, carte, contanti e risparmi.",
    titleField: "nome",
    subtitleFields: ["tipo"],
    defaultView: "list",
    trash: true,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, max: 120, inTable: true, wide: true },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        required: true,
        defaultValue: "conto",
        inTable: true,
        options: opts(["conto", "Conto corrente"], ["carta", "Carta"], ["contanti", "Contanti"], ["risparmio", "Risparmio"], ["altro", "Altro"]),
      },
      { key: "saldo_iniziale_cent", label: "Saldo iniziale", type: "money", defaultValue: "0", inTable: true },
      { key: "archiviato", label: "Non più in uso", type: "boolean", inTable: true },
      NOTE,
    ],
    sort: [{ field: "nome", asc: true }],
  },
  categories: {
    area: "finanze",
    table: "fin_categories",
    slug: "categorie",
    label: "Categorie",
    singular: "categoria",
    feminine: true,
    description: "Categorie di entrate e uscite, con budget mensile facoltativo.",
    titleField: "nome",
    subtitleFields: ["tipo"],
    defaultView: "list",
    trash: true,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, max: 80, inTable: true, wide: true },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        required: true,
        defaultValue: "uscita",
        inTable: true,
        options: opts(["uscita", "Uscita"], ["entrata", "Entrata"]),
      },
      { key: "budget_mensile_cent", label: "Budget mensile", type: "money", min: 0, inTable: true },
      { key: "archiviata", label: "Non più in uso", type: "boolean" },
    ],
    sort: [{ field: "tipo", asc: false }, { field: "nome", asc: true }],
    filters: ["tipo"],
  },

  /* ========================== BENESSERE ========================== */
  metrics: {
    area: "benessere",
    table: "health_metrics",
    slug: "parametri",
    label: "Parametri vitali",
    singular: "misurazione",
    feminine: true,
    description: "Peso, battito, sonno, passi, stress: a mano o da file.",
    titleField: "tipo",
    subtitleFields: ["data", "valore"],
    defaultView: "table",
    trash: true,
    fields: [
      { key: "data", label: "Data", type: "date", required: true, defaultValue: "today", inTable: true },
      { key: "tipo", label: "Parametro", type: "select", required: true, options: METRIC_TYPES, inTable: true },
      { key: "valore", label: "Valore", type: "number", required: true, min: 0, max: 100000, inTable: true },
      {
        key: "fonte",
        label: "Fonte",
        type: "select",
        required: true,
        defaultValue: "manuale",
        readOnly: true,
        inTable: true,
        options: opts(["manuale", "A mano"], ["import", "Da file"]),
      },
      { key: "note", label: "Note", type: "text", max: 1000, wide: true },
    ],
    sort: [{ field: "data", asc: false }, { field: "tipo", asc: true }],
    filters: ["tipo", "fonte"],
  },
  templatesWk: {
    area: "benessere",
    table: "wk_templates",
    slug: "schede",
    label: "Schede di allenamento",
    singular: "scheda",
    feminine: true,
    description: "Le tue schede: esercizi, serie, ripetizioni, carichi.",
    titleField: "nome",
    subtitleFields: ["obiettivo", "giorni"],
    defaultView: "cards",
    trash: true,
    fields: [
      { key: "nome", label: "Nome della scheda", type: "text", required: true, max: 200, inTable: true, wide: true },
      { key: "obiettivo", label: "Obiettivo", type: "text", max: 200, inTable: true },
      { key: "giorni", label: "Quando (es. lun-mer-ven)", type: "text", max: 100, inTable: true },
      NOTE,
      TAGS,
    ],
    sort: [{ field: "updated_at", asc: false }],
    filters: ["tags"],
    searchFields: ["obiettivo", "note"],
    children: [{ collection: "templateItems", parentField: "template_id", label: "Esercizi della scheda" }],
    templates: [
      { label: "Forza (3 giorni)", values: { obiettivo: "Forza", giorni: "lun-mer-ven" } },
      { label: "Prevenzione e mobilità", values: { obiettivo: "Prevenzione infortuni" } },
    ],
  },
  templateItems: {
    area: "benessere",
    table: "wk_template_items",
    label: "Esercizi della scheda",
    singular: "esercizio",
    description: "Esercizi di una scheda.",
    titleField: "exercise_id",
    trash: false,
    reorderable: true,
    fields: [
      { key: "ordine", label: "N.", type: "integer", min: 0, max: 99, inTable: true },
      { key: "exercise_id", label: "Esercizio", type: "ref", ref: "exercises", required: true, inTable: true },
      { key: "serie", label: "Serie", type: "integer", min: 1, max: 20, defaultValue: 3, inTable: true },
      { key: "ripetizioni", label: "Ripetizioni", type: "text", max: 20, defaultValue: "10", inTable: true, placeholder: "es. 8-10" },
      { key: "carico_kg", label: "Carico", type: "number", min: 0, max: 1000, unit: "kg", inTable: true },
      { key: "recupero_s", label: "Recupero", type: "integer", min: 0, max: 1800, unit: "s", inTable: true },
      { key: "note", label: "Note", type: "text", max: 500, wide: true },
    ],
    sort: [{ field: "ordine", asc: true }, { field: "created_at", asc: true }],
  },
  sessions: {
    area: "benessere",
    table: "wk_sessions",
    slug: "allenamenti",
    label: "Allenamenti svolti",
    singular: "allenamento",
    description: "Storico degli allenamenti, serie per serie.",
    titleField: "titolo",
    subtitleFields: ["data", "durata_min"],
    defaultView: "list",
    trash: true,
    fields: [
      { key: "data", label: "Data", type: "date", required: true, defaultValue: "today", inTable: true },
      { key: "titolo", label: "Titolo", type: "text", required: true, max: 200, inTable: true, wide: true },
      { key: "template_id", label: "Dalla scheda", type: "ref", ref: "templatesWk", inTable: true },
      { key: "durata_min", label: "Durata", type: "integer", min: 1, max: 600, unit: "min", inTable: true },
      { key: "sensazione", label: "Come è andata", type: "rating", inTable: true },
      NOTE,
    ],
    sort: [{ field: "data", asc: false }, { field: "created_at", asc: false }],
    filters: ["template_id", "sensazione"],
    searchFields: ["note"],
    children: [{ collection: "sets", parentField: "session_id", label: "Serie svolte", hidden: true }],
  },
  sets: {
    area: "benessere",
    table: "wk_sets",
    label: "Serie svolte",
    singular: "serie",
    feminine: true,
    description: "Serie di un allenamento.",
    titleField: "exercise_id",
    trash: false,
    fields: [
      { key: "ordine", label: "N.", type: "integer", min: 0, max: 999, inTable: true },
      { key: "exercise_id", label: "Esercizio", type: "ref", ref: "exercises", required: true, inTable: true },
      { key: "ripetizioni", label: "Ripetizioni", type: "integer", min: 0, max: 1000, inTable: true },
      { key: "carico_kg", label: "Carico", type: "number", min: 0, max: 1000, unit: "kg", inTable: true },
      { key: "fatta", label: "Fatta", type: "boolean", defaultValue: true, inTable: true },
      { key: "note", label: "Note", type: "text", max: 500, wide: true, inTable: true },
    ],
    sort: [{ field: "ordine", asc: true }, { field: "created_at", asc: true }],
  },
  exercises: {
    area: "benessere",
    table: "wk_exercises",
    slug: "esercizi",
    label: "Esercizi",
    singular: "esercizio",
    description: "Il tuo elenco di esercizi, con i progressi nel tempo.",
    titleField: "nome",
    subtitleFields: ["gruppo", "attrezzo"],
    defaultView: "list",
    trash: true,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, max: 120, inTable: true, wide: true },
      {
        key: "gruppo",
        label: "Gruppo muscolare",
        type: "select",
        inTable: true,
        options: opts(
          ["gambe", "Gambe"],
          ["glutei", "Glutei"],
          ["petto", "Petto"],
          ["schiena", "Schiena"],
          ["spalle", "Spalle"],
          ["braccia", "Braccia"],
          ["core", "Core"],
          ["total_body", "Total body"],
          ["cardio", "Cardio"],
          ["mobilita", "Mobilità"],
        ),
      },
      { key: "attrezzo", label: "Attrezzo", type: "text", max: 80, inTable: true },
      { key: "link", label: "Video di esecuzione", type: "url", wide: true },
      NOTE,
    ],
    sort: [{ field: "nome", asc: true }],
    filters: ["gruppo"],
  },
  foods: {
    area: "benessere",
    table: "nut_foods",
    slug: "alimenti",
    label: "Alimenti",
    singular: "alimento",
    description: "I tuoi alimenti con i valori per 100 g (a mano o da Open Food Facts).",
    titleField: "nome",
    subtitleFields: ["marca", "kcal"],
    defaultView: "table",
    trash: true,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, max: 200, inTable: true, wide: true },
      { key: "marca", label: "Marca", type: "text", max: 200, inTable: true },
      { key: "kcal", label: "Calorie per 100 g", type: "number", required: true, min: 0, max: 900, unit: "kcal", inTable: true },
      { key: "proteine", label: "Proteine per 100 g", type: "number", min: 0, max: 100, unit: "g", defaultValue: "0", inTable: true },
      { key: "carboidrati", label: "Carboidrati per 100 g", type: "number", min: 0, max: 100, unit: "g", defaultValue: "0", inTable: true },
      { key: "grassi", label: "Grassi per 100 g", type: "number", min: 0, max: 100, unit: "g", defaultValue: "0", inTable: true },
      { key: "porzione_g", label: "Porzione abituale", type: "number", min: 1, max: 5000, unit: "g" },
      { key: "barcode", label: "Codice a barre", type: "text", max: 32 },
      {
        key: "fonte",
        label: "Fonte",
        type: "select",
        required: true,
        defaultValue: "manuale",
        readOnly: true,
        options: opts(["manuale", "A mano"], ["openfoodfacts", "Open Food Facts"]),
      },
      NOTE,
    ],
    sort: [{ field: "nome", asc: true }],
    filters: ["fonte"],
    searchFields: ["marca"],
  },
  plans: {
    area: "benessere",
    table: "nut_plans",
    slug: "piani",
    label: "Piani alimentari",
    singular: "piano alimentare",
    description: "Piani scritti giorno per giorno, con l'obiettivo calorico.",
    titleField: "nome",
    subtitleFields: ["kcal_obiettivo"],
    defaultView: "list",
    trash: true,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, max: 200, inTable: true, wide: true },
      { key: "kcal_obiettivo", label: "Calorie al giorno", type: "integer", min: 500, max: 10000, unit: "kcal", inTable: true },
      { key: "attivo", label: "Piano in uso", type: "boolean", inTable: true },
      {
        key: "contenuto",
        label: "Piano",
        type: "longtext",
        wide: true,
        placeholder: "Lunedì\n- Colazione: …\n- Pranzo: …",
      },
      TAGS,
    ],
    sort: [{ field: "updated_at", asc: false }],
    filters: ["attivo", "tags"],
    searchFields: ["contenuto"],
  },
} satisfies Record<string, Omit<CollectionDef, "key">>;

export type CollectionKey = keyof typeof DEFS;

export const COLLECTIONS = Object.fromEntries(
  Object.entries(DEFS).map(([key, def]) => [key, { ...def, key } as CollectionDef]),
) as Record<CollectionKey, CollectionDef>;

export const COLLECTION_KEYS = Object.keys(COLLECTIONS) as CollectionKey[];

export function isCollectionKey(v: string): v is CollectionKey {
  return Object.prototype.hasOwnProperty.call(COLLECTIONS, v);
}

export function getCollection(key: CollectionKey): CollectionDef {
  return COLLECTIONS[key];
}

/** Sezione di un'area dal segmento dell'indirizzo (/studi/libri → books). */
export function collectionBySlug(area: AreaKey, slug: string): CollectionDef | null {
  return COLLECTION_KEYS.map((k) => COLLECTIONS[k]).find((c) => c.area === area && c.slug === slug) ?? null;
}

export function listHref(c: CollectionDef): string {
  return `/${c.area}/${c.slug}`;
}

export function detailHref(c: CollectionDef, id: string): string {
  return `/${c.area}/${c.slug}/${id}`;
}

/** Sezioni con pagina propria (escluse le sezioni figlie). */
export const ROUTED_COLLECTIONS = COLLECTION_KEYS.map((k) => COLLECTIONS[k]).filter((c) => c.slug);

/** Sezioni che hanno il cestino. */
export const TRASHABLE_COLLECTIONS = ROUTED_COLLECTIONS.filter((c) => c.trash);

/** Sezioni figlie ammesse per un genitore: evita colonne "genitore" scelte dal browser. */
export function childDef(parent: CollectionKey, child: CollectionKey, parentField: string): ChildDef | null {
  return COLLECTIONS[parent].children?.find((c) => c.collection === child && c.parentField === parentField) ?? null;
}

export function newLabel(c: CollectionDef): string {
  return `${c.feminine ? "Nuova" : "Nuovo"} ${c.singular}`;
}
