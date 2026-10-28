/**
 * Paesi in italiano per Nazionalità (form giocatore), con i più usati in cima
 * e il flag Unione Europea per proporre il passaporto comunitario.
 * Le nazionalità si salvano come testo, più d'una separate da "/"
 * (es. "Francia/Senegal"), come già nel database.
 * Modulo puro, testato in countries.test.mjs.
 */

/** Unione Europea (27 stati). Regno Unito, Svizzera, Norvegia, Islanda e Liechtenstein NON ne fanno parte. */
const EU = [
  "Austria", "Belgio", "Bulgaria", "Cipro", "Croazia", "Danimarca", "Estonia",
  "Finlandia", "Francia", "Germania", "Grecia", "Irlanda", "Italia", "Lettonia",
  "Lituania", "Lussemburgo", "Malta", "Paesi Bassi", "Polonia", "Portogallo",
  "Repubblica Ceca", "Romania", "Slovacchia", "Slovenia", "Spagna", "Svezia",
  "Ungheria",
];

/** Più frequenti nello scouting: in cima all'elenco. */
export const TOP_COUNTRIES = [
  "Italia", "Francia", "Spagna", "Portogallo", "Germania", "Inghilterra",
  "Paesi Bassi", "Belgio", "Brasile", "Argentina", "Croazia", "Serbia",
  "Senegal", "Nigeria", "Costa d'Avorio", "Marocco",
];

const OTHERS = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua e Barbuda",
  "Arabia Saudita", "Armenia", "Australia", "Azerbaigian", "Bahamas", "Bahrein",
  "Bangladesh", "Barbados", "Belize", "Benin", "Bhutan", "Bielorussia", "Bolivia",
  "Bosnia ed Erzegovina", "Botswana", "Brunei", "Burkina Faso", "Burundi",
  "Cambogia", "Camerun", "Canada", "Capo Verde", "Ciad", "Cile", "Cina",
  "Colombia", "Comore", "Congo", "Corea del Nord", "Corea del Sud", "Costa Rica",
  "Cuba", "Curaçao", "Dominica", "Ecuador", "Egitto", "El Salvador",
  "Emirati Arabi Uniti", "Eritrea", "Eswatini", "Etiopia", "Figi", "Filippine",
  "Gabon", "Galles", "Gambia", "Georgia", "Ghana", "Giamaica", "Giappone",
  "Gibuti", "Giordania", "Grenada", "Guatemala", "Guinea", "Guinea Equatoriale",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "India",
  "Indonesia", "Iran", "Iraq", "Irlanda del Nord", "Islanda", "Isole Fær Øer",
  "Israele", "Kazakistan", "Kenya", "Kirghizistan", "Kosovo", "Kuwait", "Laos",
  "Lesotho", "Libano", "Liberia", "Libia", "Liechtenstein", "Macedonia del Nord",
  "Madagascar", "Malawi", "Malaysia", "Maldive", "Mali", "Mauritania",
  "Mauritius", "Messico", "Moldavia", "Monaco", "Mongolia", "Montenegro",
  "Mozambico", "Myanmar", "Namibia", "Nepal", "Nicaragua", "Niger", "Norvegia",
  "Nuova Zelanda", "Oman", "Pakistan", "Palestina", "Panama",
  "Papua Nuova Guinea", "Paraguay", "Perù", "Qatar", "Regno Unito",
  "Repubblica Centrafricana", "Repubblica Democratica del Congo",
  "Repubblica Dominicana", "Ruanda", "Russia", "Saint Kitts e Nevis",
  "Saint Lucia", "Saint Vincent e Grenadine", "San Marino", "Scozia",
  "Sierra Leone", "Singapore", "Siria", "Somalia", "Sri Lanka", "Stati Uniti",
  "Sudafrica", "Sudan", "Sudan del Sud", "Suriname", "Svizzera", "Tagikistan",
  "Taiwan", "Tanzania", "Thailandia", "Togo", "Trinidad e Tobago", "Tunisia",
  "Turchia", "Turkmenistan", "Ucraina", "Uganda", "Uruguay", "Uzbekistan",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

/** Tutti i paesi: prima i più usati, poi in ordine alfabetico. */
export const COUNTRIES: string[] = [
  ...TOP_COUNTRIES,
  ...[...new Set([...EU, ...OTHERS])]
    .filter((c) => !TOP_COUNTRIES.includes(c))
    .sort((a, b) => a.localeCompare(b, "it")),
];

/** Minuscole, senza accenti né apostrofi: "Perù" = "peru", "Costa d'Avorio" = "costa d avorio". */
export function foldCountry(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BY_FOLD = new Map(COUNTRIES.map((c) => [foldCountry(c), c]));
const EU_FOLD = new Set(EU.map(foldCountry));

/** Nome del paese nell'elenco (grafia ufficiale), o null se non è nell'elenco. */
export function findCountry(name: string): string | null {
  return BY_FOLD.get(foldCountry(name)) ?? null;
}

export function isEuCountry(name: string): boolean {
  return EU_FOLD.has(foldCountry(name));
}

/**
 * Ricerca nell'elenco: prima i paesi che iniziano con il testo, poi quelli che
 * lo contengono; dentro ogni gruppo l'ordine dell'elenco (più usati in cima).
 */
export function searchCountries(query: string, exclude: string[] = []): string[] {
  const q = foldCountry(query);
  const skip = new Set(exclude.map(foldCountry));
  const pool = COUNTRIES.filter((c) => !skip.has(foldCountry(c)));
  if (!q) return pool;
  const starts: string[] = [];
  const contains: string[] = [];
  for (const c of pool) {
    const f = foldCountry(c);
    if (f.startsWith(q) || f.split(" ").some((w) => w.startsWith(q))) starts.push(c);
    else if (f.includes(q)) contains.push(c);
  }
  return [...starts, ...contains];
}

/** Testo salvato → elenco di nazionalità ("Francia/Senegal" → ["Francia", "Senegal"]). */
export function parseNationalities(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[/,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatNationalities(list: string[]): string | null {
  const clean = list.map((s) => s.trim()).filter(Boolean);
  return clean.length ? clean.join("/") : null;
}

/**
 * Passaporto da proporre: "COMUNITARIO" se almeno una nazionalità è un paese
 * dell'Unione Europea; in tutti gli altri casi nessuna proposta.
 */
export function suggestPassport(list: string[]): "COMUNITARIO" | null {
  return list.some(isEuCountry) ? "COMUNITARIO" : null;
}
