/**
 * Ruoli dei giocatori coinvolti in un piazzato (0014): offensivi, difensivi
 * e "Altro". Il form propone solo quelli della fase scelta.
 * Modulo puro, testato in player-roles.test.mjs.
 */
import type { FaseEnum } from "@/lib/types/set-pieces";

export type SetPieceRole =
  | "BATTITORE" | "BERSAGLIO" | "BLOCCO" | "SECONDO_PALO" | "FINALIZZATORE"
  | "MARCATORE" | "ZONA" | "PALO" | "BARRIERA" | "UOMO_RIPARTENZA"
  | "ALTRO";

export const OFFENSIVE_ROLES: SetPieceRole[] = ["BATTITORE", "BERSAGLIO", "BLOCCO", "SECONDO_PALO", "FINALIZZATORE"];
export const DEFENSIVE_ROLES: SetPieceRole[] = ["MARCATORE", "ZONA", "PALO", "BARRIERA", "UOMO_RIPARTENZA"];
export const SET_PIECE_ROLES: SetPieceRole[] = [...OFFENSIVE_ROLES, ...DEFENSIVE_ROLES, "ALTRO"];

export const SET_PIECE_ROLE_LABEL: Record<SetPieceRole, string> = {
  BATTITORE: "Battitore",
  BERSAGLIO: "Bersaglio",
  BLOCCO: "Blocco",
  SECONDO_PALO: "Secondo palo",
  FINALIZZATORE: "Finalizzatore",
  MARCATORE: "Marcatore",
  ZONA: "Zona",
  PALO: "Palo",
  BARRIERA: "Barriera",
  UOMO_RIPARTENZA: "Uomo in ripartenza",
  ALTRO: "Altro",
};

/** Ruoli proposti per la fase, più "Altro". */
export function rolesForPhase(fase: FaseEnum): SetPieceRole[] {
  return [...(fase === "OFFENSIVO" ? OFFENSIVE_ROLES : DEFENSIVE_ROLES), "ALTRO"];
}

/** Ruolo predefinito quando si aggiunge un giocatore. */
export function defaultRoleForPhase(fase: FaseEnum): SetPieceRole {
  return fase === "OFFENSIVO" ? "BERSAGLIO" : "MARCATORE";
}

export type SetPiecePlayerLink = { player_id: string; ruolo: SetPieceRole };

/** Elenco senza doppioni (stesso giocatore con lo stesso ruolo una volta sola). */
export function dedupePlayerLinks<T extends SetPiecePlayerLink>(links: T[]): T[] {
  const seen = new Set<string>();
  return links.filter((l) => {
    const k = `${l.player_id}|${l.ruolo}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
