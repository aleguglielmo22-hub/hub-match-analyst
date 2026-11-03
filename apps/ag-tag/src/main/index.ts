/**
 * AG Tag — processo principale: finestra, sicurezza, protocollo video, IPC.
 * Renderer isolato: contextIsolation, sandbox, niente Node; comunica solo
 * tramite il preload (window.agTag).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, nativeImage, session, shell } from "electron";
import { cancelAllJobs } from "./ffmpeg";
import { registerIpc, setTrustedRendererUrl } from "./ipc";
import { handleVideoProtocol, registerVideoScheme } from "./video-protocol";
import { getSettings } from "./settings";

app.setName("AG Tag");
registerVideoScheme();

function createWindow(): void {
  const dark = getSettings().theme === "dark";
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: "AG Tag",
    titleBarStyle: "hiddenInset",
    backgroundColor: dark ? "#141414" : "#F9F7F4",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });
  win.once("ready-to-show", () => win.show());

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (!app.isPackaged && devUrl) {
    setTrustedRendererUrl(devUrl);
    void win.loadURL(devUrl);
  } else {
    const file = join(__dirname, "../renderer/index.html");
    // Stessa forma dell'indirizzo della finestra (spazi codificati, es. "Hub%20").
    setTrustedRendererUrl(pathToFileURL(file).href);
    void win.loadFile(file);
  }
}

// Nessuna navigazione o finestra esterna: i link esterni si aprono nel browser.
app.on("web-contents-created", (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  contents.on("will-navigate", (e, url) => {
    if (url !== contents.getURL()) e.preventDefault();
  });
  contents.on("will-attach-webview", (e) => e.preventDefault());
});

void app.whenReady().then(() => {
  // Nessun permesso del browser (fotocamera, microfono, notifiche…).
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  handleVideoProtocol();
  registerIpc();

  // Icona nel Dock anche in sviluppo.
  const icon = join(app.getAppPath(), "build", "icon.png");
  if (process.platform === "darwin" && existsSync(icon)) app.dock?.setIcon(nativeImage.createFromPath(icon));

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => cancelAllJobs());
