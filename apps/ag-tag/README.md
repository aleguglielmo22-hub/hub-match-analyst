# AG Tag

Programma desktop per Mac (Apple Silicon) per la video analisi calcistica.
Usa lo stesso account e lo stesso database di AG Workspace, ma è un'app
separata: questa cartella ha le sue dipendenze e non tocca build, test e
deploy di AG Workspace. I video restano sul disco del Mac: nel database solo
dati della partita, impronta del file ed eventi.

## Prima volta

Da Terminale, nella cartella `apps/ag-tag`:

```bash
npm install        # dipendenze
npm run env        # crea .env con URL e chiave pubblica di Supabase (da .env.local di AG Workspace)
npm run ffmpeg     # scarica FFmpeg e FFprobe (GPL v3) e ne verifica l'impronta SHA-256
npm run icon       # (solo se cambia il logo) rigenera build/icon.png
```

## Comandi

```bash
npm run dev        # avvia AG Tag in sviluppo
npm test           # test
npm run typecheck  # controllo dei tipi
npm run dist       # crea "AG Tag.app" in dist/mac-arm64
```

Nota: se `npm run dev` parte da un terminale dentro VS Code e si ferma con
"Cannot read properties of undefined (reading 'setName')", avvialo con
`env -u ELECTRON_RUN_AS_NODE npm run dev` (VS Code imposta quella variabile).

## Installare l'app

1. `npm run dist`
2. Apri la cartella `apps/ag-tag/dist/mac-arm64` e trascina **AG Tag.app** in **Applicazioni**.
3. Il primo avvio: l'app non è firmata, quindi macOS la blocca con un doppio clic.
   Apri Applicazioni, **clic destro su AG Tag → Apri → Apri**. Se non basta:
   Impostazioni di Sistema → Privacy e sicurezza → in fondo, "AG Tag" → **Apri comunque**.
   Dalle volte successive si apre normalmente.

## FFmpeg e licenza

FFmpeg/FFprobe arm64 della release `b6.1.1` di ffmpeg-static (il binario si
dichiara FFmpeg 6.0), build **GPL v3** con x264. Sono programmi separati
richiamati da AG Tag; licenza e README della build sono inclusi nell'app
(`Contents/Resources/bin`). La copia di lavoro usa l'encoder di macOS
(`h264_videotoolbox`), non x264: prima di un'eventuale vendita basterà
sostituire i binari con una build LGPL, senza cambiare codice.

Regole del progetto: vedi [CLAUDE.md](../../CLAUDE.md).
