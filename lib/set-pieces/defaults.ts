/**
 * Squadre predefinite di un nuovo piazzato in base alla fase:
 * offensivo → esecutrice = mia squadra; difensivo → avversaria = mia squadra.
 * Cambiando fase si aggiornano solo i campi che l'utente non ha toccato.
 * Modulo puro, testato in defaults.test.mjs.
 */
import type { FaseEnum } from "@/lib/types/set-pieces";

type Teams = { esecutrice: string | null; avversaria: string | null };

export function teamsForPhase(
  fase: FaseEnum,
  myTeamId: string | null,
  current: Teams,
  touched: { esecutrice: boolean; avversaria: boolean },
): Teams {
  if (!myTeamId) return current;
  let esecutrice = touched.esecutrice ? current.esecutrice : fase === "OFFENSIVO" ? myTeamId : null;
  let avversaria = touched.avversaria ? current.avversaria : fase === "DIFENSIVO" ? myTeamId : null;
  // Mai la stessa squadra due volte: vince il campo scelto dall'utente.
  if (esecutrice && esecutrice === avversaria) {
    if (touched.esecutrice) avversaria = null;
    else esecutrice = null;
  }
  return { esecutrice, avversaria };
}
