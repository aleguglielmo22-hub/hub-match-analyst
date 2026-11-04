/**
 * Ponte tra renderer e processo principale: espone solo i metodi di AgTagApi.
 * Nessun accesso a Node o a ipcRenderer dal renderer.
 */
import { contextBridge, ipcRenderer } from "electron";
import { IPC, type AgTagApi, type WorkingCopyProgress } from "@shared/api";

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);

const api: AgTagApi = {
  auth: {
    current: () => invoke(IPC.authCurrent),
    signIn: (email, password) => invoke(IPC.authSignIn, email, password),
    signOut: () => invoke(IPC.authSignOut),
  },
  lookups: {
    list: () => invoke(IPC.lookupsList),
    create: (kind, name) => invoke(IPC.lookupsCreate, kind, name),
  },
  media: {
    pickVideo: () => invoke(IPC.mediaPick),
  },
  matches: {
    list: () => invoke(IPC.matchesList),
    create: (input) => invoke(IPC.matchesCreate, input),
    get: (id) => invoke(IPC.matchesGet, id),
    openVideo: (id) => invoke(IPC.matchesOpenVideo, id),
    relink: (id) => invoke(IPC.matchesRelink, id),
    makeWorkingCopy: (id) => invoke(IPC.matchesMakeWorkingCopy, id),
    cancelWorkingCopy: (id) => invoke(IPC.matchesCancelWorkingCopy, id),
    onProgress: (listener) => {
      const handler = (_e: unknown, p: WorkingCopyProgress) => listener(p);
      ipcRenderer.on(IPC.matchesProgress, handler);
      return () => ipcRenderer.removeListener(IPC.matchesProgress, handler);
    },
  },
  panel: {
    get: () => invoke(IPC.panelGet),
    pickImport: () => invoke(IPC.panelPickImport),
    confirmImport: (token) => invoke(IPC.panelConfirmImport, token),
    setTiming: (code, leadMs, lagMs) => invoke(IPC.panelSetTiming, code, leadMs, lagMs),
  },
  settings: {
    get: () => invoke(IPC.settingsGet),
    chooseCacheDir: () => invoke(IPC.settingsChooseCacheDir),
    setShortcuts: (shortcuts) => invoke(IPC.settingsSetShortcuts, shortcuts),
    setTheme: (theme) => invoke(IPC.settingsSetTheme, theme),
    setEventKeys: (keys) => invoke(IPC.settingsSetEventKeys, keys),
  },
};

contextBridge.exposeInMainWorld("agTag", api);
