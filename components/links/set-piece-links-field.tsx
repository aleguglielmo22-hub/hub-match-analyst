"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LinkTarget } from "@/app/(app)/collegamenti/actions";
import {
  SET_PIECE_ROLE_LABEL,
  defaultRoleForPhase,
  rolesForPhase,
  type SetPieceRole,
} from "@/lib/set-pieces/player-roles";
import type { FaseEnum } from "@/lib/types/set-pieces";
import { LinkPicker, LinkRow } from "./link-picker";

export type FormSetPiecePlayer = LinkTarget & { ruolo: SetPieceRole };

/** Giocatori coinvolti nel piazzato, ciascuno con il suo ruolo (si salva col form). */
export function SetPiecePlayersField({
  fase,
  value,
  onChange,
}: {
  fase: FaseEnum;
  value: FormSetPiecePlayer[];
  onChange: (next: FormSetPiecePlayer[]) => void;
}) {
  const roles = rolesForPhase(fase);
  const key = (p: FormSetPiecePlayer) => `${p.id}|${p.ruolo}`;

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="divide-y divide-border/40">
          {value.map((p) => (
            <LinkRow
              key={key(p)}
              target={p}
              onRemove={() => onChange(value.filter((x) => key(x) !== key(p)))}
            >
              <Select
                value={p.ruolo}
                onValueChange={(v) => {
                  const ruolo = v as SetPieceRole;
                  // Stesso giocatore con lo stesso ruolo una volta sola.
                  if (!ruolo || value.some((x) => x.id === p.id && x.ruolo === ruolo)) return;
                  onChange(value.map((x) => (key(x) === key(p) ? { ...x, ruolo } : x)));
                }}
              >
                <SelectTrigger className="h-9 w-40 shrink-0 text-xs max-md:h-11" aria-label={`Ruolo di ${p.title}`}>
                  <SelectValue>{(v: SetPieceRole) => SET_PIECE_ROLE_LABEL[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Il ruolo attuale resta scelto anche se è dell'altra fase. */}
                  {[...new Set([...roles, p.ruolo])].map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {SET_PIECE_ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LinkRow>
          ))}
        </ul>
      )}
      <LinkPicker
        kind="player"
        // Lo stesso giocatore si può aggiungere di nuovo per un secondo ruolo.
        excludeIds={[]}
        onPick={(t) => {
          const used = new Set(value.filter((x) => x.id === t.id).map((x) => x.ruolo));
          const ruolo = [defaultRoleForPhase(fase), ...roles].find((r) => !used.has(r));
          if (ruolo) onChange([...value, { ...t, ruolo }]);
        }}
      />
    </div>
  );
}

/** Voci del Cloud collegate (si salvano col form). */
export function ArchiveLinksField({
  value,
  onChange,
}: {
  value: LinkTarget[];
  onChange: (next: LinkTarget[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="divide-y divide-border/40">
          {value.map((t) => (
            <LinkRow key={t.id} target={t} onRemove={() => onChange(value.filter((x) => x.id !== t.id))} />
          ))}
        </ul>
      )}
      <LinkPicker kind="archive" excludeIds={value.map((t) => t.id)} onPick={(t) => onChange([...value, t])} />
    </div>
  );
}
