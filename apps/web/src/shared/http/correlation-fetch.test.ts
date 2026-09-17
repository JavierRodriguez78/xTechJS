import { beforeEach, describe, expect, it, vi } from "vitest";
import { installCorrelationFetch } from "./correlation-fetch";

describe("installCorrelationFetch", () => {
  let nativeFetch: ReturnType<typeof vi.fn>;
  let beacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nativeFetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })));
    vi.stubGlobal("fetch", nativeFetch);
    beacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { ...window.navigator, sendBeacon: beacon });
    vi.stubGlobal("crypto", { ...window.crypto, randomUUID: () => "11111111-2222-3333-4444-555555555555" });
    installCorrelationFetch();
  });

  it("propaga x-correlation-id en cada peticion", async () => {
    await window.fetch("/api/customers");

    const [, init] = nativeFetch.mock.calls[0] as [unknown, RequestInit];
    expect(new Headers(init.headers).get("x-correlation-id")).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("conserva las cabeceras propias de la llamada", async () => {
    await window.fetch("/api/customers", { headers: { authorization: "Bearer token-de-prueba" } });

    const [, init] = nativeFetch.mock.calls[0] as [unknown, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer token-de-prueba");
    expect(headers.get("x-correlation-id")).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("publica traza de inicio y fin sin enviar cuerpo ni credenciales", async () => {
    await window.fetch("/api/customers?q=secreto", { method: "POST", headers: { authorization: "Bearer token-de-prueba" }, body: JSON.stringify({ password: "no-debe-salir" }) });

    expect(beacon).toHaveBeenCalledTimes(2);
    const payloads = await Promise.all(beacon.mock.calls.map(async ([, blob]) => JSON.parse(await (blob as Blob).text()) as Record<string, unknown>));
    expect(payloads.map((payload) => payload.phase)).toEqual(["started", "completed"]);
    expect(payloads[0]).toMatchObject({ method: "POST", path: "/api/customers" });
    expect(payloads[1]).toMatchObject({ status: 200 });
    expect(JSON.stringify(payloads)).not.toContain("secreto");
    expect(JSON.stringify(payloads)).not.toContain("no-debe-salir");
    expect(JSON.stringify(payloads)).not.toContain("Bearer");
  });

  it("marca la traza como fallida y repropaga el error de red", async () => {
    nativeFetch.mockRejectedValueOnce(new Error("sin conexion"));

    await expect(window.fetch("/api/customers")).rejects.toThrow("sin conexion");
    const payloads = await Promise.all(beacon.mock.calls.map(async ([, blob]) => JSON.parse(await (blob as Blob).text()) as Record<string, unknown>));
    expect(payloads.map((payload) => payload.phase)).toEqual(["started", "failed"]);
  });
});
