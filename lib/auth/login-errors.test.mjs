// Test della traduzione degli errori di login. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INVALID_CREDENTIALS_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  isNetworkError,
  loginErrorMessage,
} from "./login-errors.ts";

test("errori di rete reali di supabase-js e dei browser", () => {
  // Forma reale misurata con supabase-js contro un indirizzo inesistente.
  const sdk = { name: "AuthRetryableFetchError", status: 0, message: "fetch failed" };
  assert.equal(loginErrorMessage(sdk).description, NETWORK_ERROR_MESSAGE);
  assert.ok(isNetworkError({ message: "Failed to fetch" })); // Chrome
  assert.ok(isNetworkError({ message: "Load failed" })); // Safari
  assert.ok(isNetworkError({ message: "NetworkError when attempting to fetch resource." })); // Firefox
  assert.ok(isNetworkError(new TypeError("Failed to fetch")));
  // Progetto in pausa / in riavvio: risposta 5xx
  assert.ok(isNetworkError({ name: "AuthRetryableFetchError", status: 503, message: "" }));
});

test("credenziali errate restano un messaggio distinto", () => {
  const wrong = { name: "AuthApiError", status: 400, code: "invalid_credentials", message: "Invalid login credentials" };
  assert.equal(isNetworkError(wrong), false);
  assert.equal(loginErrorMessage(wrong).description, INVALID_CREDENTIALS_MESSAGE);
});

test("altri errori mantengono il messaggio originale", () => {
  const weak = { name: "AuthWeakPasswordError", status: 422, message: "Password should be at least 6 characters." };
  assert.equal(loginErrorMessage(weak).description, weak.message);
  assert.equal(loginErrorMessage(null).description, "Errore sconosciuto");
});
