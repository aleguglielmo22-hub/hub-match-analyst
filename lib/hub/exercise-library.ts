/**
 * Esercizi di base, da aggiungere con un clic al proprio elenco (Benessere →
 * Esercizi). Nomi in italiano. Nessun video né immagine: per quelli si può
 * aggiungere il link di un video a ogni esercizio.
 * Modulo puro, testato in exercise-library.test.mjs.
 */
export type LibraryExercise = { nome: string; gruppo: string; attrezzo: string };

export const EXERCISE_LIBRARY: readonly LibraryExercise[] = [
  // Gambe
  { nome: "Squat", gruppo: "gambe", attrezzo: "Bilanciere" },
  { nome: "Squat frontale", gruppo: "gambe", attrezzo: "Bilanciere" },
  { nome: "Squat bulgaro", gruppo: "gambe", attrezzo: "Manubri" },
  { nome: "Goblet squat", gruppo: "gambe", attrezzo: "Kettlebell" },
  { nome: "Leg press", gruppo: "gambe", attrezzo: "Macchina" },
  { nome: "Affondi", gruppo: "gambe", attrezzo: "Manubri" },
  { nome: "Leg extension", gruppo: "gambe", attrezzo: "Macchina" },
  { nome: "Leg curl", gruppo: "gambe", attrezzo: "Macchina" },
  { nome: "Stacco rumeno", gruppo: "gambe", attrezzo: "Bilanciere" },
  { nome: "Calf raise in piedi", gruppo: "gambe", attrezzo: "Macchina" },
  // Glutei
  { nome: "Hip thrust", gruppo: "glutei", attrezzo: "Bilanciere" },
  { nome: "Glute bridge", gruppo: "glutei", attrezzo: "Corpo libero" },
  { nome: "Abduzioni all'elastico", gruppo: "glutei", attrezzo: "Elastico" },
  // Petto
  { nome: "Panca piana", gruppo: "petto", attrezzo: "Bilanciere" },
  { nome: "Panca inclinata con manubri", gruppo: "petto", attrezzo: "Manubri" },
  { nome: "Croci ai cavi", gruppo: "petto", attrezzo: "Cavi" },
  { nome: "Piegamenti sulle braccia", gruppo: "petto", attrezzo: "Corpo libero" },
  { nome: "Dip alle parallele", gruppo: "petto", attrezzo: "Parallele" },
  // Schiena
  { nome: "Stacco da terra", gruppo: "schiena", attrezzo: "Bilanciere" },
  { nome: "Trazioni alla sbarra", gruppo: "schiena", attrezzo: "Sbarra" },
  { nome: "Lat machine", gruppo: "schiena", attrezzo: "Macchina" },
  { nome: "Rematore con bilanciere", gruppo: "schiena", attrezzo: "Bilanciere" },
  { nome: "Rematore con manubrio", gruppo: "schiena", attrezzo: "Manubri" },
  { nome: "Pulley basso", gruppo: "schiena", attrezzo: "Cavi" },
  { nome: "Face pull", gruppo: "schiena", attrezzo: "Cavi" },
  // Spalle
  { nome: "Military press", gruppo: "spalle", attrezzo: "Bilanciere" },
  { nome: "Lento avanti con manubri", gruppo: "spalle", attrezzo: "Manubri" },
  { nome: "Alzate laterali", gruppo: "spalle", attrezzo: "Manubri" },
  { nome: "Alzate posteriori", gruppo: "spalle", attrezzo: "Manubri" },
  // Braccia
  { nome: "Curl con bilanciere", gruppo: "braccia", attrezzo: "Bilanciere" },
  { nome: "Curl a martello", gruppo: "braccia", attrezzo: "Manubri" },
  { nome: "French press", gruppo: "braccia", attrezzo: "Bilanciere" },
  { nome: "Push down ai cavi", gruppo: "braccia", attrezzo: "Cavi" },
  // Core
  { nome: "Plank", gruppo: "core", attrezzo: "Corpo libero" },
  { nome: "Crunch", gruppo: "core", attrezzo: "Corpo libero" },
  { nome: "Sollevamento gambe alla sbarra", gruppo: "core", attrezzo: "Sbarra" },
  { nome: "Russian twist", gruppo: "core", attrezzo: "Palla medica" },
  { nome: "Ab wheel", gruppo: "core", attrezzo: "Ruota addominale" },
  // Total body, cardio e mobilità
  { nome: "Kettlebell swing", gruppo: "total_body", attrezzo: "Kettlebell" },
  { nome: "Burpees", gruppo: "total_body", attrezzo: "Corpo libero" },
  { nome: "Corsa su tapis roulant", gruppo: "cardio", attrezzo: "Tapis roulant" },
  { nome: "Cyclette", gruppo: "cardio", attrezzo: "Cyclette" },
  { nome: "Vogatore", gruppo: "cardio", attrezzo: "Vogatore" },
  { nome: "Corda per saltare", gruppo: "cardio", attrezzo: "Corda" },
  { nome: "Mobilità dell'anca", gruppo: "mobilita", attrezzo: "Corpo libero" },
  { nome: "Mobilità delle spalle", gruppo: "mobilita", attrezzo: "Corpo libero" },
];

/** Nome per il confronto: minuscole, senza accenti né spazi doppi. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Esercizi della libreria che non sono già nell'elenco (stesso nome = già presente). */
export function missingFromLibrary(existingNames: readonly string[]): LibraryExercise[] {
  const have = new Set(existingNames.map(normalizeName));
  return EXERCISE_LIBRARY.filter((e) => !have.has(normalizeName(e.nome)));
}
