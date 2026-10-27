/**
 * Ricerche recenti ed elementi aperti di recente, salvati nel browser.
 * Ogni accesso è protetto: senza salvataggio locale le liste restano vuote.
 */
import { browserStorage } from "@/lib/forms/draft";
import type { SearchKind } from "./global-results";

const QUERIES_KEY = "agw:ricerca:recenti";
const OPENED_KEY = "agw:ricerca:aperti";
const MAX = 5;

export type RecentItem = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

function read<T>(key: string): T[] {
  try {
    const raw = browserStorage()?.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown[]): void {
  try {
    browserStorage()?.setItem(key, JSON.stringify(value));
  } catch {
    // niente da fare
  }
}

export function recentQueries(): string[] {
  return read<string>(QUERIES_KEY).filter((q) => typeof q === "string").slice(0, MAX);
}

export function rememberQuery(query: string): void {
  const q = query.trim();
  if (q.length < 2) return;
  const list = recentQueries().filter((x) => x.toLowerCase() !== q.toLowerCase());
  write(QUERIES_KEY, [q, ...list].slice(0, MAX));
}

export function recentOpened(): RecentItem[] {
  return read<RecentItem>(OPENED_KEY)
    .filter((x) => x && typeof x.href === "string" && typeof x.title === "string")
    .slice(0, MAX);
}

export function rememberOpened(item: RecentItem): void {
  const list = recentOpened().filter((x) => x.href !== item.href);
  write(OPENED_KEY, [item, ...list].slice(0, MAX));
}
