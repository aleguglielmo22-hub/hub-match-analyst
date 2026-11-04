import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { MatchListItem, Settings } from "@shared/api";
import {
  buildPair,
  preferredLockMessage,
  preferredSide,
  press,
  type ActionPair,
  type OpenRecording,
  type Panel,
  type Side,
  type Tag,
  type TagFilter,
} from "@shared/panel";
import { eventFor } from "@shared/panel-shortcuts";
import { api } from "../lib/api";
import { ActionsList } from "./ActionsList";
import { CodingPanel } from "./CodingPanel";

/** Comandi del lettore usati dalla codifica. */
export type PlayerHandle = {
  currentMs(): number;
  durationMs(): number | null;
  seekMs(ms: number): void;
};

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

/**
 * Lettore + pannello di codifica + elenco delle azioni.
 * Parte A della fase 2: le azioni restano in memoria finché la pagina è aperta
 * (il salvataggio arriva con la migrazione 0019).
 */
export function CodingWorkspace({
  match,
  settings,
  durationMs,
  video,
}: {
  match: MatchListItem;
  settings: Settings;
  durationMs: number | null;
  video: (handle: RefObject<PlayerHandle | null>) => ReactNode;
}) {
  const player = useRef<PlayerHandle | null>(null);
  const [panel, setPanel] = useState<Panel | null | undefined>(undefined);
  const [preferred, setPreferred] = useState<Side | null>(() =>
    preferredSide(match.preferred_team_id, match.home?.id ?? null, match.away?.id ?? null),
  );
  const [pairs, setPairs] = useState<ActionPair[]>([]);
  const [open, setOpen] = useState<OpenRecording[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TagFilter>({ eventCode: null, perspective: null, minStars: 0 });
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    api.panel.get().then(setPanel, () => setPanel(null));
  }, []);

  // Durata degli eventi in corso.
  useEffect(() => {
    if (open.length === 0) return;
    const t = setInterval(() => setNowMs(player.current?.currentMs() ?? 0), 200);
    return () => clearInterval(t);
  }, [open.length]);

  const record = useCallback(
    (code: string) => {
      if (!panel || !preferred) return;
      const t = player.current?.currentMs() ?? 0;
      setNowMs(t);
      const r = press(panel, open, code, t);
      setOpen(r.open);
      if (r.finished.length === 0) return;
      const duration = player.current?.durationMs() ?? durationMs;
      const created = r.finished.map((f) => buildPair(panel, f, preferred, duration, () => crypto.randomUUID()));
      setPairs((list) => [...list, ...created]);
      setSelectedId(created[created.length - 1].original.id);
    },
    [panel, preferred, open, durationMs],
  );

  // Lettere degli eventi (non mentre si scrive in un campo).
  useEffect(() => {
    if (!panel) return;
    const codes = panel.events.map((e) => e.code);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || isTyping(e.target)) return;
      const code = eventFor(e, settings.eventKeys, codes);
      if (!code) return;
      e.preventDefault();
      record(code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, settings.eventKeys, record]);

  const updateTag = useCallback((id: string, patch: Partial<Pick<Tag, "labels" | "note" | "stars">>) => {
    setPairs((list) =>
      list.map((p) =>
        p.original.id === id
          ? { ...p, original: { ...p.original, ...patch } }
          : p.mirror?.id === id
            ? { ...p, mirror: { ...p.mirror, ...patch } }
            : p,
      ),
    );
  }, []);

  const removePair = useCallback((id: string) => {
    setPairs((list) => list.filter((p) => p.original.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  }, []);

  const select = useCallback((pairId: string) => {
    setSelectedId(pairId);
    const p = pairs.find((x) => x.original.id === pairId);
    if (p) player.current?.seekMs(p.original.startMs);
  }, [pairs]);

  const selected = useMemo(() => pairs.find((p) => p.original.id === selectedId) ?? null, [pairs, selectedId]);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {video(player)}
        {panel && preferred && (
          <ActionsList
            panel={panel}
            match={match}
            preferred={preferred}
            pairs={pairs}
            filter={filter}
            onFilter={setFilter}
            selectedId={selectedId}
            onSelect={select}
          />
        )}
      </div>
      <CodingPanel
        panel={panel}
        match={match}
        preferred={preferred}
        onPreferred={setPreferred}
        lockMessage={preferredLockMessage(pairs.length)}
        eventKeys={settings.eventKeys}
        open={open}
        nowMs={nowMs}
        onPress={record}
        selected={selected}
        onUpdateTag={updateTag}
        onDelete={removePair}
        onSeek={(ms) => player.current?.seekMs(ms)}
      />
    </div>
  );
}
