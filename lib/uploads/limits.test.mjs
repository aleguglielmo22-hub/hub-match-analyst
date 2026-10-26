// Test dei limiti di caricamento. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkUploadFile, uploadMimeType, UPLOAD_MAX_BYTES } from "./limits.ts";

const MB = 1024 * 1024;
const file = (name, size, type) => ({ name, size, type });

test("PDF, immagini e Office sotto i 20 MB sono ammessi", () => {
  assert.equal(checkUploadFile(file("report.pdf", 2 * MB, "application/pdf")), null);
  assert.equal(checkUploadFile(file("foto.jpg", 3 * MB, "image/jpeg")), null);
  assert.equal(
    checkUploadFile(file("dati.xlsx", MB, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
    null,
  );
  assert.equal(checkUploadFile(file("limite.pdf", UPLOAD_MAX_BYTES, "application/pdf")), null);
});

test("file troppo pesante: messaggio con il peso in MB", () => {
  assert.equal(
    checkUploadFile(file("big.pdf", 35.25 * MB, "application/pdf")),
    "File troppo pesante (35,3 MB): il limite è 20 MB. Per video e file pesanti usa un link.",
  );
});

test("video e tipi non ammessi sono rifiutati", () => {
  assert.equal(
    checkUploadFile(file("clip.mp4", 5 * MB, "video/mp4")),
    "I video non si caricano: inseriscili come link.",
  );
  assert.match(checkUploadFile(file("a.zip", MB, "application/zip")), /Tipo di file non ammesso/);
  assert.match(checkUploadFile(file("foto.heic", MB, "image/heic")), /Tipo di file non ammesso/);
});

test("tipo mancante: ricavato dall'estensione", () => {
  assert.equal(
    uploadMimeType(file("Slide.PPTX", MB, "")),
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  );
  assert.equal(uploadMimeType(file("vecchio.doc", MB, "application/octet-stream")), "application/msword");
  assert.equal(uploadMimeType(file("senza-estensione", MB, "")), null);
  assert.equal(checkUploadFile(file("note.docx", MB, "")), null);
});
