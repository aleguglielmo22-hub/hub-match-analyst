"use client";

import { useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import {
  Arc,
  Arrow,
  Circle,
  Ellipse,
  Group,
  Layer,
  Line,
  Rect,
  RegularPolygon,
  Shape,
  Stage,
  Text,
  Transformer,
} from "react-konva";
import {
  PITCH_LENGTH,
  PITCH_WIDTH,
  fieldViewport,
  fitViewport,
  screenToField,
  type ArrowEl,
  type BoardData,
  type BoardElement,
  type EquipmentEl,
  type FieldType,
  type PlayerEl,
} from "@/lib/board/model";
import {
  BOARD_COLORS,
  ZONE_FILL,
  ZONE_OPACITY,
  boardCssVar,
  type BoardColorKey,
} from "@/lib/board/colors";

export type BoardColors = Record<BoardColorKey, string>;

/** Colori dalle variabili CSS dell'app (--board-*), con i valori di riserva. */
export function readBoardColors(): BoardColors {
  const out = { ...BOARD_COLORS } as BoardColors;
  if (typeof window === "undefined") return out;
  const css = getComputedStyle(document.documentElement);
  for (const key of Object.keys(BOARD_COLORS) as BoardColorKey[]) {
    const v = css.getPropertyValue(boardCssVar(key)).trim();
    if (v) out[key] = v;
  }
  return out;
}

const LINE = 0.15; // spessore delle linee del campo, in metri

/** Campo con strisce e linee regolamentari (metri). */
function Pitch({ field, c }: { field: FieldType; c: BoardColors }) {
  const vp = fieldViewport(field);
  const stripes = useMemo(
    () => Array.from({ length: 10 }, (_, i) => i).filter((i) => i % 2 === 1),
    [],
  );
  const boxW = 40.32;
  const sixW = 18.32;
  const goalW = 7.32;
  const mid = PITCH_WIDTH / 2;
  const side = (end: 0 | 1) => {
    const x0 = end === 0 ? 0 : PITCH_LENGTH;
    const dir = end === 0 ? 1 : -1;
    return (
      <Group key={end}>
        <Rect x={end === 0 ? 0 : PITCH_LENGTH - 16.5} y={mid - boxW / 2} width={16.5} height={boxW} stroke={c.lines} strokeWidth={LINE} />
        <Rect x={end === 0 ? 0 : PITCH_LENGTH - 5.5} y={mid - sixW / 2} width={5.5} height={sixW} stroke={c.lines} strokeWidth={LINE} />
        <Circle x={x0 + dir * 11} y={mid} radius={0.22} fill={c.lines} />
        <Arc
          x={x0 + dir * 11}
          y={mid}
          innerRadius={9.15}
          outerRadius={9.15}
          angle={106.3}
          rotation={end === 0 ? -53.15 : 180 - 53.15}
          stroke={c.lines}
          strokeWidth={LINE}
        />
        <Rect x={end === 0 ? -1.8 : PITCH_LENGTH} y={mid - goalW / 2} width={1.8} height={goalW} stroke={c.lines} strokeWidth={LINE} />
      </Group>
    );
  };
  return (
    <Group listening={false}>
      <Rect x={vp.x} y={vp.y} width={vp.w} height={vp.h} fill={c.pitch} />
      {stripes.map((i) => (
        <Rect key={i} x={i * 10.5} y={0} width={10.5} height={PITCH_WIDTH} fill={c.pitchStripe} />
      ))}
      <Rect x={0} y={0} width={PITCH_LENGTH} height={PITCH_WIDTH} stroke={c.lines} strokeWidth={LINE} />
      <Line points={[PITCH_LENGTH / 2, 0, PITCH_LENGTH / 2, PITCH_WIDTH]} stroke={c.lines} strokeWidth={LINE} />
      <Circle x={PITCH_LENGTH / 2} y={mid} radius={9.15} stroke={c.lines} strokeWidth={LINE} />
      <Circle x={PITCH_LENGTH / 2} y={mid} radius={0.22} fill={c.lines} />
      {[0, 90, 180, 270].map((rot, i) => (
        <Arc
          key={rot}
          x={i === 0 || i === 3 ? 0 : PITCH_LENGTH}
          y={i < 2 ? 0 : PITCH_WIDTH}
          innerRadius={1}
          outerRadius={1}
          angle={90}
          rotation={rot}
          stroke={c.lines}
          strokeWidth={LINE}
        />
      ))}
      {side(0)}
      {side(1)}
    </Group>
  );
}

const PLAYER_R = 1.15;

const LAYER: Record<BoardElement["type"], number> = {
  zone: 0,
  pen: 1,
  arrow: 2,
  equipment: 3,
  player: 4,
  ball: 5,
  text: 6,
};

/** Area invisibile più grande del simbolo: più facile da prendere col dito. */
function TouchArea() {
  return <Circle radius={2.2} fill="#000" opacity={0} />;
}

function PlayerShape({ el, c, upright }: { el: PlayerEl; c: BoardColors; upright: number }) {
  const home = el.team === "home";
  const fill = home ? c.home : c.away;
  const stroke = home ? c.homeStroke : c.awayStroke;
  const text = home ? c.homeText : c.awayText;
  const side = PLAYER_R * 1.8;
  return (
    <>
      {/* Portiere: anello esterno tratteggiato */}
      {el.gk &&
        (home ? (
          <Circle radius={PLAYER_R + 0.55} stroke={c.homeStroke} strokeWidth={0.22} dash={[0.45, 0.3]} />
        ) : (
          <Rect
            x={-side / 2 - 0.5}
            y={-side / 2 - 0.5}
            width={side + 1}
            height={side + 1}
            cornerRadius={0.3}
            stroke={c.away}
            strokeWidth={0.22}
            dash={[0.45, 0.3]}
          />
        ))}
      {home ? (
        <Circle radius={PLAYER_R} fill={fill} stroke={stroke} strokeWidth={0.22} />
      ) : (
        <Rect x={-side / 2} y={-side / 2} width={side} height={side} cornerRadius={0.25} fill={fill} stroke={stroke} strokeWidth={0.22} />
      )}
      <Text
        text={el.gk && !el.number ? "P" : el.number}
        fontSize={1.15}
        fontStyle="bold"
        fontFamily="system-ui, sans-serif"
        fill={text}
        width={PLAYER_R * 2}
        height={PLAYER_R * 2}
        offsetX={PLAYER_R}
        offsetY={PLAYER_R}
        rotation={upright}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </>
  );
}

function EquipmentShape({ el, c }: { el: EquipmentEl; c: BoardColors }) {
  switch (el.kind) {
    case "cone":
      return <RegularPolygon sides={3} radius={0.75} fill={c.equipment} stroke={c.equipmentStroke} strokeWidth={0.15} />;
    case "disc":
      return <Ellipse radiusX={0.55} radiusY={0.3} fill={c.equipment} stroke={c.equipmentStroke} strokeWidth={0.12} />;
    case "minigoal":
      return <Line points={[-1.5, 0.8, -1.5, -0.8, 1.5, -0.8, 1.5, 0.8]} stroke={c.equipmentStroke} strokeWidth={0.3} lineJoin="round" hitStrokeWidth={1.5} />;
    case "dummy":
      return <Rect x={-0.4} y={-0.9} width={0.8} height={1.8} cornerRadius={0.35} fill={c.ink} stroke={c.equipmentStroke} strokeWidth={0.15} />;
    case "wall":
      return (
        <>
          {[-1.5, -0.5, 0.5, 1.5].map((dx) => (
            <Rect key={dx} x={dx - 0.4} y={-0.9} width={0.8} height={1.8} cornerRadius={0.35} fill={c.ink} stroke={c.equipmentStroke} strokeWidth={0.15} />
          ))}
        </>
      );
  }
}

/** Freccia ondulata (conduzione): onda lungo il tratto, punta finale. */
function WavyArrow({ el, c, listening }: { el: ArrowEl; c: BoardColors; listening: boolean }) {
  const [x1, y1, x2, y2] = el.points;
  return (
    <Shape
      listening={listening}
      stroke={c.arrow}
      fill={c.arrow}
      strokeWidth={0.22}
      hitStrokeWidth={2}
      sceneFunc={(ctx, shape) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.01) return;
        const ux = dx / len;
        const uy = dy / len;
        const head = Math.min(1.1, len / 2);
        const waveLen = Math.max(0, len - head);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const amp = 0.45;
        const period = 1.6;
        for (let t = 0; t <= waveLen; t += 0.1) {
          const off = Math.sin((t / period) * Math.PI * 2) * amp;
          ctx.lineTo(x1 + ux * t - uy * off, y1 + uy * t + ux * off);
        }
        ctx.lineTo(x1 + ux * waveLen, y1 + uy * waveLen);
        ctx.strokeShape(shape);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - ux * head - uy * head * 0.5, y2 - uy * head + ux * head * 0.5);
        ctx.lineTo(x2 - ux * head + uy * head * 0.5, y2 - uy * head - ux * head * 0.5);
        ctx.closePath();
        ctx.fillShape(shape);
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeShape(shape);
      }}
    />
  );
}

export type ElementEvents = {
  onSelect?: (id: string) => void;
  /** Fine trascinamento: spostamento in metri. */
  onMove?: (id: string, dx: number, dy: number, absolute?: { x: number; y: number }) => void;
  onTransform?: (id: string, t: { rotation: number; scaleX: number; scaleY: number }) => void;
  /** Estremo di una freccia trascinato (`done` = rilasciato). */
  onArrowPoint?: (id: string, index: 0 | 1, x: number, y: number, done: boolean) => void;
};

function ElementNode({
  el,
  c,
  editable,
  selected,
  events,
  upright,
}: {
  el: BoardElement;
  c: BoardColors;
  editable: boolean;
  selected: boolean;
  events: ElementEvents;
  /** Rotazione che tiene dritti i testi quando il campo è ruotato. */
  upright: number;
}) {
  const common = {
    id: el.id,
    draggable: editable,
    listening: editable,
    onPointerDown: (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (!editable) return;
      e.cancelBubble = true;
      events.onSelect?.(el.id);
    },
  };
  const dragPositioned = {
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      const n = e.target;
      events.onMove?.(el.id, 0, 0, { x: n.x(), y: n.y() });
    },
  };
  const dragOffset = {
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      const n = e.target;
      const dx = n.x();
      const dy = n.y();
      n.position({ x: 0, y: 0 });
      events.onMove?.(el.id, dx, dy);
    },
  };
  const transform = {
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const n = e.target;
      // Testi e materiale sono mostrati ruotati di `upright`: si salva la rotazione sul campo.
      const rotation = el.type === "text" || el.type === "equipment" ? n.rotation() - upright : n.rotation();
      const t = { rotation, scaleX: n.scaleX(), scaleY: n.scaleY() };
      n.scale({ x: 1, y: 1 });
      events.onTransform?.(el.id, t);
    },
  };

  switch (el.type) {
    case "player":
      return (
        <Group {...common} {...dragPositioned} x={el.x} y={el.y}>
          <TouchArea />
          <PlayerShape el={el} c={c} upright={upright} />
        </Group>
      );
    case "ball":
      return (
        <Group {...common} {...dragPositioned} x={el.x} y={el.y}>
          <TouchArea />
          <Circle radius={0.6} fill={c.ball} stroke={c.ink} strokeWidth={0.14} />
          <RegularPolygon sides={5} radius={0.24} fill={c.ink} listening={false} />
        </Group>
      );
    case "arrow": {
      const handles = editable && selected;
      return (
        <>
          {el.kind === "dribble" ? (
            <Group {...common} {...dragOffset}>
              <WavyArrow el={el} c={c} listening={editable} />
            </Group>
          ) : (
            <Arrow
              {...common}
              {...dragOffset}
              points={el.points}
              stroke={c.arrow}
              fill={c.arrow}
              strokeWidth={0.22}
              pointerLength={1}
              pointerWidth={1}
              dash={el.kind === "pass" ? [0.8, 0.6] : undefined}
              hitStrokeWidth={2}
              lineCap="round"
            />
          )}
          {handles &&
            ([0, 1] as const).map((i) => (
              <Circle
                key={i}
                x={el.points[i * 2]}
                y={el.points[i * 2 + 1]}
                radius={0.7}
                fill="rgba(255,255,255,0.35)"
                stroke={c.ink}
                strokeWidth={0.1}
                draggable
                hitStrokeWidth={1.5}
                onPointerDown={(e) => {
                  e.cancelBubble = true;
                }}
                onDragMove={(e) => events.onArrowPoint?.(el.id, i, e.target.x(), e.target.y(), false)}
                onDragEnd={(e) => events.onArrowPoint?.(el.id, i, e.target.x(), e.target.y(), true)}
              />
            ))}
        </>
      );
    }
    case "zone": {
      const fill = ZONE_FILL[el.color];
      return el.shape === "rect" ? (
        <Rect
          {...common}
          {...dragPositioned}
          {...transform}
          x={el.x}
          y={el.y}
          width={el.w}
          height={el.h}
          offsetX={el.w / 2}
          offsetY={el.h / 2}
          rotation={el.rotation}
          fill={fill}
          opacity={ZONE_OPACITY + 0.15}
          stroke={fill}
          strokeWidth={0.15}
          fillEnabled
          cornerRadius={0.3}
        />
      ) : (
        <Ellipse
          {...common}
          {...dragPositioned}
          {...transform}
          x={el.x}
          y={el.y}
          radiusX={el.w / 2}
          radiusY={el.h / 2}
          rotation={el.rotation}
          fill={fill}
          opacity={ZONE_OPACITY + 0.15}
          stroke={fill}
          strokeWidth={0.15}
        />
      );
    }
    case "text":
      return (
        <Text
          {...common}
          {...dragPositioned}
          {...transform}
          x={el.x}
          y={el.y}
          rotation={el.rotation + upright}
          text={el.text || "Testo"}
          fontSize={1.7}
          fontStyle="bold"
          fontFamily="system-ui, sans-serif"
          fill={c.lines}
          shadowColor={c.ink}
          shadowBlur={0.3}
          shadowOpacity={0.9}
        />
      );
    case "pen":
      return (
        <Line
          {...common}
          {...dragOffset}
          points={el.points}
          stroke={c.arrow}
          strokeWidth={0.25}
          tension={0.4}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={1.5}
        />
      );
    case "equipment":
      return (
        <Group {...common} {...dragPositioned} {...transform} x={el.x} y={el.y} rotation={el.rotation + upright}>
          <TouchArea />
          <EquipmentShape el={el} c={c} />
        </Group>
      );
  }
}

/**
 * Disegno della lavagna (campo + elementi), modificabile o in sola lettura.
 * Le coordinate degli elementi sono in metri: un gruppo scalato le adatta
 * alle dimensioni in pixel.
 */
export function BoardStage({
  board,
  width,
  height,
  colors,
  editable = false,
  elementsInteractive = editable,
  selectedId = null,
  rotatable = false,
  resizable = false,
  events = {},
  onBackgroundPointer,
  stageRef,
  onReady,
}: {
  board: BoardData;
  width: number;
  height: number;
  colors: BoardColors;
  editable?: boolean;
  /** Elementi selezionabili e trascinabili (solo con lo strumento "Seleziona"). */
  elementsInteractive?: boolean;
  selectedId?: string | null;
  rotatable?: boolean;
  resizable?: boolean;
  events?: ElementEvents;
  /** Tocco sul campo (fuori dagli elementi), in metri. */
  onBackgroundPointer?: (phase: "down" | "move" | "up", x: number, y: number) => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
  onReady?: (stage: Konva.Stage) => void;
}) {
  const fit = fitViewport(board.field, width, height);
  const vp = fieldViewport(board.field);
  const elements = board.frames[0]?.elements ?? [];
  // Livelli: le zone sotto, poi tratti, materiale, giocatori, pallone e testi.
  const layered = [...elements].sort((a, b) => LAYER[a.type] - LAYER[b.type]);
  const innerRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const ref = stageRef ?? innerRef;

  useEffect(() => {
    if (!onReady || !ref.current) return;
    ref.current.draw();
    onReady(ref.current);
    // Solo alla prima visualizzazione.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Riquadro di selezione (rotazione / ridimensionamento) sull'elemento scelto.
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selected && selected.type !== "arrow" ? ref.current?.findOne(`#${selected.id}`) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selected, ref]);

  const toMeters = (stage: Konva.Stage) => {
    const p = stage.getPointerPosition();
    return p ? screenToField(fit, p.x, p.y) : null;
  };
  const background = (phase: "down" | "move" | "up") => (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (!onBackgroundPointer) return;
    const stage = e.target.getStage();
    const m = stage && toMeters(stage);
    if (m) onBackgroundPointer(phase, m.x, m.y);
  };

  return (
    <Stage
      ref={ref}
      width={width}
      height={height}
      onPointerDown={background("down")}
      onPointerMove={background("move")}
      onPointerUp={background("up")}
      style={{ touchAction: "none" }}
    >
      <Layer>
        {/* Fuori dalla porzione di campo scelta: fondo più scuro. */}
        <Rect width={width} height={height} fill={colors.ink} opacity={0.85} listening={false} />
        <Group
          x={fit.offsetX}
          y={fit.offsetY}
          scaleX={fit.scale}
          scaleY={fit.scale}
          rotation={fit.rotated ? -90 : 0}
          clipX={vp.x}
          clipY={vp.y}
          clipWidth={vp.w}
          clipHeight={vp.h}
        >
          <Pitch field={board.field} c={colors} />
          {layered.map((el) => (
            <ElementNode
              key={el.id}
              el={el}
              c={colors}
              editable={elementsInteractive}
              selected={el.id === selectedId}
              events={events}
              upright={fit.rotated ? 90 : 0}
            />
          ))}
        </Group>
        {editable && (
          <Transformer
            ref={trRef}
            rotateEnabled={rotatable}
            resizeEnabled={resizable}
            keepRatio={false}
            flipEnabled={false}
            anchorSize={22}
            rotateAnchorOffset={28}
            borderStroke="#ffffff"
            borderDash={[4, 4]}
            anchorStroke="#111827"
            anchorFill="#ffffff"
            ignoreStroke
          />
        )}
      </Layer>
    </Stage>
  );
}
