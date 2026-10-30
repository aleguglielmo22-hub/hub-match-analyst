"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BrickWall,
  Check,
  Circle,
  Cone,
  Copy,
  Disc,
  Goal,
  MousePointer2,
  MoveRight,
  PencilLine,
  PersonStanding,
  RectangleHorizontal,
  Redo2,
  RotateCcw,
  RotateCw,
  Smartphone,
  Square,
  Trash2,
  Type,
  Undo2,
  Waves,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIELD_LABEL,
  ZONE_COLORS,
  currentElements,
  duplicateElement,
  isBoardEmpty,
  nextPlayerNumber,
  withElements,
  type ArrowKind,
  type BoardData,
  type BoardElement,
  type EquipmentKind,
  type FieldType,
  type ZoneColor,
} from "@/lib/board/model";
import { TEMPLATES, templateBoard, type TemplateId } from "@/lib/board/templates";
import { ZONE_FILL, ZONE_LABEL } from "@/lib/board/colors";
import { BoardStage, readBoardColors, type BoardColors } from "./board-stage";

type Tool =
  | "select"
  | "home"
  | "away"
  | "ball"
  | ArrowKind
  | "rect"
  | "ellipse"
  | "text"
  | "pen"
  | EquipmentKind;

const TOOL_GROUPS: { label: string; tools: { id: Tool; label: string; icon: React.ReactNode }[] }[] = [
  {
    label: "Base",
    tools: [
      { id: "select", label: "Seleziona e sposta", icon: <MousePointer2 className="h-5 w-5" /> },
      { id: "home", label: "Giocatore nostro", icon: <Circle className="h-5 w-5 fill-current" /> },
      { id: "away", label: "Giocatore avversario", icon: <Square className="h-5 w-5" /> },
      { id: "ball", label: "Pallone", icon: <Circle className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: "Frecce",
    tools: [
      { id: "pass", label: "Passaggio (tratteggiata)", icon: <ArrowUpRight className="h-5 w-5 [stroke-dasharray:3_3]" /> },
      { id: "move", label: "Movimento (continua)", icon: <MoveRight className="h-5 w-5" /> },
      { id: "dribble", label: "Conduzione (ondulata)", icon: <Waves className="h-5 w-5" /> },
    ],
  },
  {
    label: "Zone e note",
    tools: [
      { id: "rect", label: "Zona rettangolare", icon: <RectangleHorizontal className="h-5 w-5" /> },
      { id: "ellipse", label: "Zona ellittica", icon: <Circle className="h-5 w-5 scale-x-125" /> },
      { id: "text", label: "Testo", icon: <Type className="h-5 w-5" /> },
      { id: "pen", label: "Matita libera", icon: <PencilLine className="h-5 w-5" /> },
    ],
  },
  {
    label: "Materiale",
    tools: [
      { id: "cone", label: "Cono", icon: <Cone className="h-5 w-5" /> },
      { id: "disc", label: "Cinesino", icon: <Disc className="h-5 w-5" /> },
      { id: "minigoal", label: "Porticina", icon: <Goal className="h-5 w-5" /> },
      { id: "dummy", label: "Sagoma", icon: <PersonStanding className="h-5 w-5" /> },
      { id: "wall", label: "Barriera di sagome", icon: <BrickWall className="h-5 w-5" /> },
    ],
  },
];

const ARROW_KINDS: Tool[] = ["pass", "move", "dribble"];
const EQUIPMENT: Tool[] = ["cone", "disc", "minigoal", "dummy", "wall"];
/** Strumenti che restano attivi dopo aver piazzato un elemento (se ne mettono di solito diversi). */
const STICKY: Tool[] = ["home", "away", ...EQUIPMENT];

const newId = () => crypto.randomUUID();

function round(v: number) {
  return Math.round(v * 100) / 100;
}

/**
 * Lavagna tattica a tutto schermo. Modificabile (onDone restituisce i dati)
 * o in sola lettura. Un solo fotogramma in questa versione.
 */
export default function BoardEditor({
  initial,
  readOnly = false,
  title,
  onDone,
  onClose,
}: {
  initial: BoardData;
  readOnly?: boolean;
  title?: string;
  onDone?: (board: BoardData) => void;
  onClose: () => void;
}) {
  const [board, setBoard] = useState<BoardData>(initial);
  const [past, setPast] = useState<BoardData[]>([]);
  const [future, setFuture] = useState<BoardData[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<BoardElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [colors] = useState<BoardColors>(() => readBoardColors());
  const containerRef = useRef<HTMLDivElement>(null);
  const changed = past.length > 0;

  const elements = currentElements(board);
  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const commit = (next: BoardData) => {
    setPast((p) => [...p.slice(-99), board]);
    setBoard(next);
    setFuture([]);
  };
  // Punto di partenza di zona/freccia mentre si trascina.
  const drawStart = useRef<[number, number]>([0, 0]);
  const setElements = (next: BoardElement[]) => commit(withElements(board, next));
  const updateElement = (id: string, patch: (el: BoardElement) => BoardElement, record = true) => {
    const next = withElements(board, elements.map((e) => (e.id === id ? patch(e) : e)));
    if (record) commit(next);
    else setBoard(next);
  };

  function undo() {
    const prev = past.at(-1);
    if (!prev) return;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [board, ...f]);
    setBoard(prev);
    setSelectedId(null);
  }
  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, board]);
    setBoard(next);
    setSelectedId(null);
  }
  function remove(id: string) {
    setElements(elements.filter((e) => e.id !== id));
    setSelectedId(null);
  }
  function duplicate(id: string) {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const copy = duplicateElement(el, newId());
    setElements([...elements, copy]);
    setSelectedId(copy.id);
  }
  function rotate(id: string, delta: number) {
    updateElement(id, (e) => ("rotation" in e ? { ...e, rotation: (e.rotation + delta) % 360 } : e));
  }
  function clearAll() {
    if (isBoardEmpty(board)) return;
    if (!window.confirm("Svuotare la lavagna? Potrai comunque annullare.")) return;
    setElements([]);
    setSelectedId(null);
  }
  function applyTemplate(id: TemplateId) {
    if (!isBoardEmpty(board) && !window.confirm("La lavagna non è vuota: sostituire il contenuto con lo schema scelto?")) {
      return;
    }
    commit(templateBoard(id));
    setSelectedId(null);
    setTool("select");
  }
  function setField(field: FieldType) {
    if (field !== board.field) commit({ ...board, field });
  }
  function close() {
    if (!readOnly && changed && !window.confirm("Chiudere senza applicare le modifiche alla lavagna?")) return;
    onClose();
  }

  // Dimensioni del riquadro disponibile.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pagina sotto bloccata mentre la lavagna è aperta.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Tastiera: Canc elimina, Ctrl/Cmd+Z annulla, Maiusc+Ctrl/Cmd+Z ripete, Esc chiude.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "Escape") return close();
      if (readOnly || typing) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        remove(selectedId);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Tocco sul campo con lo strumento scelto.
  function onBackgroundPointer(phase: "down" | "move" | "up", x: number, y: number) {
    if (readOnly) return;
    x = round(x);
    y = round(y);
    if (phase === "down") {
      drawStart.current = [x, y];
      if (tool === "select") {
        setSelectedId(null);
        return;
      }
      if (tool === "home" || tool === "away") {
        const el: BoardElement = {
          id: newId(),
          type: "player",
          team: tool,
          x,
          y,
          number: nextPlayerNumber(elements, tool),
          gk: false,
        };
        setElements([...elements, el]);
        setSelectedId(el.id);
      } else if (tool === "ball") {
        const el: BoardElement = { id: newId(), type: "ball", x, y };
        setElements([...elements, el]);
        setSelectedId(el.id);
      } else if (tool === "text") {
        const el: BoardElement = { id: newId(), type: "text", x, y, text: "Testo", rotation: 0 };
        setElements([...elements, el]);
        setSelectedId(el.id);
      } else if (EQUIPMENT.includes(tool)) {
        const el: BoardElement = { id: newId(), type: "equipment", kind: tool as EquipmentKind, x, y, rotation: 0 };
        setElements([...elements, el]);
        setSelectedId(el.id);
      } else if (ARROW_KINDS.includes(tool)) {
        setDrawing({ id: newId(), type: "arrow", kind: tool as ArrowKind, points: [x, y, x, y] });
      } else if (tool === "rect" || tool === "ellipse") {
        setDrawing({ id: newId(), type: "zone", shape: tool, x, y, w: 0, h: 0, rotation: 0, color: "yellow" });
      } else if (tool === "pen") {
        setDrawing({ id: newId(), type: "pen", points: [x, y, x, y] });
      }
      if (!STICKY.includes(tool) && !ARROW_KINDS.includes(tool) && tool !== "rect" && tool !== "ellipse" && tool !== "pen") {
        setTool("select");
      }
      return;
    }
    if (!drawing) return;
    if (phase === "move") {
      if (drawing.type === "arrow") {
        setDrawing({ ...drawing, points: [drawing.points[0], drawing.points[1], x, y] });
      } else if (drawing.type === "pen") {
        const [lx, ly] = drawing.points.slice(-2);
        if (Math.hypot(x - lx, y - ly) >= 0.3) setDrawing({ ...drawing, points: [...drawing.points, x, y] });
      } else if (drawing.type === "zone") {
        const [sx, sy] = drawStart.current;
        setDrawing({
          ...drawing,
          x: round((sx + x) / 2),
          y: round((sy + y) / 2),
          w: round(Math.abs(x - sx)),
          h: round(Math.abs(y - sy)),
        });
      }
      return;
    }
    // up: si salva solo un tratto abbastanza lungo (un tocco per errore non crea nulla).
    let el: BoardElement | null = drawing;
    if (drawing.type === "arrow") {
      const [x1, y1, x2, y2] = drawing.points;
      if (Math.hypot(x2 - x1, y2 - y1) < 1.5) el = null;
    } else if (drawing.type === "zone") {
      el = drawing.w >= 1 && drawing.h >= 1 ? drawing : null;
    } else if (drawing.type === "pen" && drawing.points.length < 6) {
      el = null;
    }
    setDrawing(null);
    if (el) {
      setElements([...elements, el]);
      setSelectedId(el.id);
    }
  }

  const shown = drawing ? withElements(board, [...elements, drawing]) : board;
  const rotatable = !!selected && (selected.type === "zone" || selected.type === "text" || selected.type === "equipment");
  const resizable = !!selected && selected.type === "zone";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Lavagna: ${title}` : "Lavagna tattica"}
      className="fixed inset-0 z-[60] flex flex-col bg-background text-foreground"
    >
      {/* Barra in alto: chiudi, campo, schemi, annulla/ripeti, fatto */}
      <header className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <IconButton label={readOnly ? "Chiudi" : "Chiudi senza applicare"} onClick={close}>
          <X className="h-5 w-5" />
        </IconButton>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title ?? "Lavagna tattica"}</p>
        {!readOnly && (
          <>
            <select
              aria-label="Tipo di campo"
              value={board.field}
              onChange={(e) => setField(e.target.value as FieldType)}
              className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
            >
              {(Object.keys(FIELD_LABEL) as FieldType[]).map((f) => (
                <option key={f} value={f}>
                  {FIELD_LABEL[f]}
                </option>
              ))}
            </select>
            <select
              aria-label="Schemi di partenza"
              value=""
              onChange={(e) => e.target.value && applyTemplate(e.target.value as TemplateId)}
              className="h-11 max-w-[9rem] rounded-lg border border-input bg-background px-2 text-sm max-sm:hidden"
            >
              <option value="">Schemi…</option>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <IconButton label="Annulla" onClick={undo} disabled={past.length === 0}>
              <Undo2 className="h-5 w-5" />
            </IconButton>
            <IconButton label="Ripeti" onClick={redo} disabled={future.length === 0}>
              <Redo2 className="h-5 w-5" />
            </IconButton>
            <IconButton label="Svuota la lavagna" onClick={clearAll} disabled={isBoardEmpty(board)}>
              <Trash2 className="h-5 w-5" />
            </IconButton>
            <button
              type="button"
              onClick={() => onDone?.(board)}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Check className="h-4 w-4" />
              Fatto
            </button>
          </>
        )}
      </header>

      {/* Telefono in verticale: invito a ruotare */}
      <p className="hidden items-center gap-2 bg-muted px-3 py-1.5 text-xs text-muted-foreground max-md:portrait:flex">
        <Smartphone className="h-4 w-4 rotate-90" />
        Ruota il telefono in orizzontale per avere più spazio.
      </p>

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden" style={{ background: colors.pitch }}>
        {size.width > 0 && size.height > 0 && (
          <BoardStage
            board={shown}
            width={size.width}
            height={size.height}
            colors={colors}
            editable={!readOnly}
            elementsInteractive={!readOnly && tool === "select"}
            selectedId={selectedId}
            rotatable={rotatable}
            resizable={resizable}
            onBackgroundPointer={readOnly ? undefined : onBackgroundPointer}
            events={{
              onSelect: (id) => {
                setSelectedId(id);
              },
              onMove: (id, dx, dy, abs) =>
                updateElement(id, (e) => {
                  if (abs && "x" in e) return { ...e, x: round(abs.x), y: round(abs.y) };
                  if (e.type === "arrow") {
                    const [x1, y1, x2, y2] = e.points;
                    return { ...e, points: [round(x1 + dx), round(y1 + dy), round(x2 + dx), round(y2 + dy)] };
                  }
                  if (e.type === "pen") return { ...e, points: e.points.map((v, i) => round(v + (i % 2 === 0 ? dx : dy))) };
                  return e;
                }),
              onTransform: (id, t) =>
                updateElement(id, (e) => {
                  if (e.type === "zone") {
                    return {
                      ...e,
                      rotation: round(t.rotation),
                      w: round(Math.max(1, e.w * t.scaleX)),
                      h: round(Math.max(1, e.h * t.scaleY)),
                    };
                  }
                  return "rotation" in e ? { ...e, rotation: round(t.rotation) } : e;
                }),
              onArrowPoint: (id, index, x, y, done) =>
                updateElement(
                  id,
                  (e) => {
                    if (e.type !== "arrow") return e;
                    const p = [...e.points] as typeof e.points;
                    p[index * 2] = round(x);
                    p[index * 2 + 1] = round(y);
                    return { ...e, points: p };
                  },
                  done,
                ),
            }}
          />
        )}
      </div>

      {!readOnly && (
        <footer className="border-t border-border/60 bg-background pb-[env(safe-area-inset-bottom)]">
          {selected && (
            <SelectionPanel
              el={selected}
              onChange={(patch) => updateElement(selected.id, (e) => ({ ...e, ...patch }) as BoardElement)}
              onRotate={(d) => rotate(selected.id, d)}
              onDuplicate={() => duplicate(selected.id)}
              onDelete={() => remove(selected.id)}
            />
          )}
          {/* Strumenti: a portata di pollice, scorrono in orizzontale */}
          <div className="flex items-center gap-3 overflow-x-auto px-2 py-1.5" role="toolbar" aria-label="Strumenti della lavagna">
            {TOOL_GROUPS.map((g) => (
              <div key={g.label} className="flex shrink-0 items-center gap-1" role="group" aria-label={g.label}>
                {g.tools.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    title={t.label}
                    aria-label={t.label}
                    aria-pressed={tool === t.id}
                    onClick={() => {
                      setTool(t.id);
                      if (t.id !== "select") setSelectedId(null);
                    }}
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-lg transition-colors",
                      tool === t.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {t.icon}
                  </button>
                ))}
              </div>
            ))}
            <select
              aria-label="Schemi di partenza"
              value=""
              onChange={(e) => e.target.value && applyTemplate(e.target.value as TemplateId)}
              className="h-11 shrink-0 rounded-lg border border-input bg-background px-2 text-sm sm:hidden"
            >
              <option value="">Schemi…</option>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </footer>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-foreground hover:bg-muted disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** Opzioni dell'elemento selezionato: numero, portiere, colore, testo, ruota, duplica, elimina. */
function SelectionPanel({
  el,
  onChange,
  onRotate,
  onDuplicate,
  onDelete,
}: {
  el: BoardElement;
  onChange: (patch: Partial<BoardElement>) => void;
  onRotate: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const canRotate = el.type === "zone" || el.type === "text" || el.type === "equipment";
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-2 py-1.5 text-sm">
      {el.type === "player" && (
        <>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Numero</span>
            <input
              value={el.number}
              onChange={(e) => onChange({ number: e.target.value.slice(0, 3) })}
              inputMode="numeric"
              className="h-11 w-16 rounded-lg border border-input bg-background px-2 text-center text-base md:text-sm"
            />
          </label>
          <ToggleChip active={el.gk} onClick={() => onChange({ gk: !el.gk })}>
            Portiere
          </ToggleChip>
          <ToggleChip active={false} onClick={() => onChange({ team: el.team === "home" ? "away" : "home" })}>
            {el.team === "home" ? "Rendi avversario" : "Rendi nostro"}
          </ToggleChip>
        </>
      )}
      {el.type === "zone" && (
        <div className="flex items-center gap-1" role="group" aria-label="Colore della zona">
          {ZONE_COLORS.map((c: ZoneColor) => (
            <button
              key={c}
              type="button"
              title={ZONE_LABEL[c]}
              aria-label={ZONE_LABEL[c]}
              aria-pressed={el.color === c}
              onClick={() => onChange({ color: c })}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-lg",
                el.color === c ? "ring-2 ring-primary" : "",
              )}
            >
              <span className="h-6 w-6 rounded-md border border-border" style={{ background: ZONE_FILL[c] }} />
            </button>
          ))}
        </div>
      )}
      {el.type === "text" && (
        <input
          value={el.text}
          onChange={(e) => onChange({ text: e.target.value.slice(0, 200) })}
          aria-label="Testo"
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-base md:text-sm"
        />
      )}
      <div className="ml-auto flex items-center gap-1">
        {canRotate && (
          <>
            <IconButton label="Ruota a sinistra" onClick={() => onRotate(-15)}>
              <RotateCcw className="h-5 w-5" />
            </IconButton>
            <IconButton label="Ruota a destra" onClick={() => onRotate(15)}>
              <RotateCw className="h-5 w-5" />
            </IconButton>
          </>
        )}
        <IconButton label="Duplica" onClick={onDuplicate}>
          <Copy className="h-5 w-5" />
        </IconButton>
        <IconButton label="Elimina" onClick={onDelete}>
          <Trash2 className="h-5 w-5 text-destructive" />
        </IconButton>
      </div>
    </div>
  );
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center rounded-lg border px-3 text-xs font-medium",
        active ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
