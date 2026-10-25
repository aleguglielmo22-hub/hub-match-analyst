import type { KeyboardEvent } from "react";

const FIELD_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';

/**
 * Da collegare a `<form onKeyDown>`: su dispositivi touch il tasto "Avanti"
 * (enterKeyHint="next") passa al campo successivo invece di inviare il form.
 * Su desktop Invio continua a inviare il form come prima.
 */
export function focusNextFieldOnEnter(e: KeyboardEvent<HTMLFormElement>): void {
  if (e.key !== "Enter" || e.defaultPrevented || e.nativeEvent.isComposing) return;
  const el = e.target;
  if (!(el instanceof HTMLInputElement) || el.enterKeyHint !== "next") return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;

  e.preventDefault();
  const fields = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>(FIELD_SELECTOR),
  ).filter((f) => f.offsetParent !== null);
  const next = fields[fields.indexOf(el) + 1];
  if (next) next.focus();
  else el.blur();
}
