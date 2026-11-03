import type { AgTagApi } from "../shared/api";

declare global {
  interface Window {
    agTag: AgTagApi;
  }
}

export {};
