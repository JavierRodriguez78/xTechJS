import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageKey = "xtechjs.staff-session";
const disconnectChatSocket = vi.fn();

vi.mock("../chat/socket", () => ({ disconnectChatSocket }));

// `session.ts` lee `localStorage` al cargarse, asi que cada caso necesita una
// importacion nueva del modulo con el almacenamiento ya preparado.
async function loadSession() {
  vi.resetModules();
  return import("./session");
}

function storedSession(role: string) {
  return JSON.stringify({ accessToken: "token-guardado", user: { id: "user-1", displayName: "Ada", email: "ada@example.com", role } });
}

describe("sesion del portal interno", () => {
  beforeEach(() => { disconnectChatSocket.mockClear(); });
  afterEach(() => { vi.resetModules(); });

  it("restaura la sesion guardada de un rol interno", async () => {
    localStorage.setItem(storageKey, storedSession("technician"));

    const { staffSession } = await loadSession();

    expect(staffSession.value?.user.role).toBe("technician");
  });

  it("descarta una sesion de cliente guardada en el portal interno", async () => {
    localStorage.setItem(storageKey, storedSession("customer"));

    const { staffSession } = await loadSession();

    expect(staffSession.value).toBeNull();
  });

  it("limpia el almacenamiento corrupto en lugar de arrastrarlo", async () => {
    localStorage.setItem(storageKey, "{no-es-json");

    const { staffSession } = await loadSession();

    expect(staffSession.value).toBeNull();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("persiste la sesion tras un login correcto", async () => {
    const payload = { accessToken: "token-nuevo", user: { id: "user-2", displayName: "Grace", email: "grace@example.com", role: "admin" } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }))));

    const { signIn, staffSession } = await loadSession();
    await signIn("grace@example.com", "una-clave-larga");

    expect(staffSession.value?.accessToken).toBe("token-nuevo");
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "null")).toEqual(payload);
  });

  it("rechaza el login de una cuenta de cliente y no guarda nada", async () => {
    const payload = { accessToken: "token-cliente", user: { id: "user-3", displayName: "Cliente", email: "cliente@example.com", role: "customer" } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }))));

    const { signIn, staffSession } = await loadSession();

    await expect(signIn("cliente@example.com", "una-clave-larga")).rejects.toThrow("no tiene acceso al portal interno");
    expect(staffSession.value).toBeNull();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("propaga un error legible cuando las credenciales no son validas", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 401 }))));

    const { signIn } = await loadSession();

    await expect(signIn("grace@example.com", "clave-incorrecta")).rejects.toThrow("Credenciales no validas");
  });

  it("cierra la sesion y desconecta el socket de chat", async () => {
    localStorage.setItem(storageKey, storedSession("admin"));

    const { signOut, staffSession } = await loadSession();
    signOut();

    expect(staffSession.value).toBeNull();
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(disconnectChatSocket).toHaveBeenCalledOnce();
  });
});
