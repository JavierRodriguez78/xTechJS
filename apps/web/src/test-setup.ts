import { beforeEach, vi } from "vitest";

// Ninguna prueba debe salir a la red: un `fetch` sin doblar falla de forma
// explicita en lugar de lanzar una peticion real contra la API.
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("fetch no doblado en la prueba"))));
});
