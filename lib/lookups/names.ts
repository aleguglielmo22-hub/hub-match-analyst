/**
 * Confronto dei nomi delle anagrafiche (squadre, competizioni, stagioni):
 * stessa regola dell'indice univoco del DB (0013) → maiuscole e spazi
 * iniziali/finali non contano. Modulo puro, testato in names.test.mjs.
 */

export function lookupKey(name: string): string {
  return name.trim().toLowerCase();
}

/** L'anagrafica con lo stesso nome, se esiste già. */
export function findByName<T extends { label: string }>(list: T[], name: string): T | undefined {
  const key = lookupKey(name);
  return key ? list.find((o) => lookupKey(o.label) === key) : undefined;
}
