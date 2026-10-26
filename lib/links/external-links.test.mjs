// Test dei link esterni del Cloud. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectLinkSource,
  normalizeExternalUrl,
  videoEmbedUrl,
} from "./external-links.ts";

test("aggiunge https:// se manca e mantiene http/https", () => {
  assert.equal(
    normalizeExternalUrl("  drive.google.com/file/d/abc/view "),
    "https://drive.google.com/file/d/abc/view",
  );
  assert.equal(normalizeExternalUrl("http://nas.local.it/video"), "http://nas.local.it/video");
  assert.equal(normalizeExternalUrl("https://youtu.be/dQw4w9WgXcQ"), "https://youtu.be/dQw4w9WgXcQ");
});

test("rifiuta testo vuoto, parole senza dominio e protocolli non web", () => {
  assert.equal(normalizeExternalUrl(""), null);
  assert.equal(normalizeExternalUrl("partita"), null);
  assert.equal(normalizeExternalUrl("javascript:alert(1)"), null);
  assert.equal(normalizeExternalUrl("ftp://server.it/file"), null);
  assert.equal(normalizeExternalUrl("https://" + "a".repeat(2050) + ".it"), null);
});

test("riconosce la fonte dall'indirizzo", () => {
  const cases = {
    "https://drive.google.com/file/d/1/view": "google-drive",
    "https://docs.google.com/spreadsheets/d/1": "google-drive",
    "https://www.dropbox.com/s/x/partita.mp4": "dropbox",
    "https://1drv.ms/v/s!abc": "onedrive",
    "https://club.sharepoint.com/:v:/x": "onedrive",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ": "youtube",
    "https://youtu.be/dQw4w9WgXcQ": "youtube",
    "https://vimeo.com/76979871": "vimeo",
    "https://platform.wyscout.com/app/?x": "wyscout",
    "https://example.com/video": "altro",
    "https://notyoutube.com/x": "altro",
  };
  for (const [url, source] of Object.entries(cases)) {
    assert.equal(detectLinkSource(url), source, url);
  }
});

test("anteprima incorporata solo per YouTube e Vimeo", () => {
  const yt = "https://www.youtube.com/embed/dQw4w9WgXcQ";
  assert.equal(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), yt);
  assert.equal(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ?si=x"), yt);
  assert.equal(videoEmbedUrl("https://youtube.com/shorts/dQw4w9WgXcQ"), yt);
  assert.equal(videoEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ"), yt);
  assert.equal(videoEmbedUrl("https://www.youtube.com/channel/UCabc"), null);
  assert.equal(videoEmbedUrl("https://vimeo.com/76979871"), "https://player.vimeo.com/video/76979871");
  assert.equal(
    videoEmbedUrl("https://player.vimeo.com/video/76979871"),
    "https://player.vimeo.com/video/76979871",
  );
  assert.equal(videoEmbedUrl("https://drive.google.com/file/d/1/view"), null);
  assert.equal(videoEmbedUrl("non un url"), null);
});
