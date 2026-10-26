/**
 * Creazione "una volta sola": l'id del nuovo elemento è generato all'apertura
 * del form e inviato con il salvataggio. Se un secondo invio (es. dopo una
 * risposta persa) trova già l'elemento con quell'id, lo considera riuscito
 * invece di crearne un doppione. Modulo puro, testato in insert-once.test.mjs.
 */

type InsertError = { code?: string; message: string } | null;

/** Violazione di chiave unica in Postgres (qui: id già esistente). */
const UNIQUE_VIOLATION = "23505";

export async function insertOnce(opts: {
  insert: () => PromiseLike<{ error: InsertError }>;
  /** True se l'elemento con quell'id esiste già nel workspace. */
  exists: () => Promise<boolean>;
}): Promise<"created" | "existing"> {
  const { error } = await opts.insert();
  if (!error) return "created";
  if (error.code === UNIQUE_VIOLATION && (await opts.exists())) return "existing";
  throw new Error(error.message);
}
