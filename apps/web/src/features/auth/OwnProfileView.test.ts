import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OwnProfileView from "./OwnProfileView.vue";
import { OwnProfileRequestError } from "./profile";
import { staffSession, setStaffSession } from "./session";

const mocks = vi.hoisted(() => ({ getOwnProfile: vi.fn(), updateOwnCredentials: vi.fn(), replace: vi.fn(), leaveGuard: vi.fn() }));
vi.mock("./profile", async (importOriginal) => ({ ...await importOriginal<typeof import("./profile")>(), getOwnProfile: mocks.getOwnProfile, updateOwnCredentials: mocks.updateOwnCredentials }));
vi.mock("vue-router", () => ({ useRouter: () => ({ replace: mocks.replace }), onBeforeRouteLeave: (guard: unknown) => mocks.leaveGuard(guard) }));
vi.mock("../chat/socket", () => ({ disconnectChatSocket: vi.fn() }));

const user = { id: "staff-1", email: "eva@example.test", displayName: "Eva Tecnica", role: "technician" as const, storeId: "store-1" };
let wrapper: ReturnType<typeof mount> | undefined;
async function render() {
  wrapper = mount(OwnProfileView, { global: { stubs: { RouterLink: true } } });
  await flushPromises();
  return wrapper;
}
async function fillPassword(view: ReturnType<typeof mount>, confirmation = "new-secure-password") {
  await view.find('[aria-label="Contrasena actual"]').setValue("current-password");
  await view.find('[aria-label="Nueva contrasena"]').setValue("new-secure-password");
  await view.find('[aria-label="Confirmar nueva contrasena"]').setValue(confirmation);
}

describe("perfil propio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setStaffSession({ accessToken: "old-token", user });
    mocks.getOwnProfile.mockResolvedValue({ ...user, active: true });
    mocks.updateOwnCredentials.mockResolvedValue({ accessToken: "renewed-token", user: { ...user, email: "new@example.test" } });
  });
  afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks(); });

  it("carga la identidad propia y separa email de contrasena", async () => {
    const view = await render();
    expect(view.find(".profile-identity").text()).toContain("Eva Tecnica");
    expect((view.find('[aria-label="Nuevo email"]').element as HTMLInputElement).value).toBe("eva@example.test");
    expect(view.findAll("form")).toHaveLength(2);
    expect(view.find('input[name="role"]').exists()).toBe(false);
  });

  it("actualiza el email, persiste el nuevo token y vacia la contrasena", async () => {
    const view = await render();
    await view.find('[aria-label="Nuevo email"]').setValue("new@example.test");
    await view.find('[aria-label="Contrasena actual para email"]').setValue("current-password");
    await view.find("#email-form").trigger("submit");
    await flushPromises();
    expect(mocks.updateOwnCredentials).toHaveBeenCalledWith({ email: "new@example.test", currentPassword: "current-password" });
    expect(staffSession.value?.accessToken).toBe("renewed-token");
    expect(staffSession.value?.user.email).toBe("new@example.test");
    expect(JSON.parse(localStorage.getItem("xtechjs.staff-session")!).user.email).toBe("new@example.test");
    expect((view.find('[aria-label="Contrasena actual para email"]').element as HTMLInputElement).value).toBe("");
    expect(view.find('[role="status"]').text()).toBe("Email actualizado.");
  });

  it("rechaza email invalido o ausencia de contrasena actual antes de enviar", async () => {
    const view = await render();
    await view.find('[aria-label="Nuevo email"]').setValue("invalid");
    await view.find("#email-form").trigger("submit");
    expect(mocks.updateOwnCredentials).not.toHaveBeenCalled();
    expect(view.find("#email-error").text()).toContain("valido");
    expect(view.find("#email-password-error").text()).toContain("actual");
  });

  it("muestra los errores del servidor junto al campo de email", async () => {
    mocks.updateOwnCredentials.mockRejectedValueOnce(new OwnProfileRequestError("Ese email ya esta registrado.", 409, { email: "Ese email ya esta registrado." }));
    const view = await render();
    await view.find('[aria-label="Nuevo email"]').setValue("occupied@example.test");
    await view.find('[aria-label="Contrasena actual para email"]').setValue("current-password");
    await view.find("#email-form").trigger("submit");
    await flushPromises();
    expect(view.find("#email-error").text()).toContain("registrado");
    expect(staffSession.value?.accessToken).toBe("old-token");
  });

  it("comprueba confirmacion y longitud de la nueva contrasena", async () => {
    const view = await render();
    await fillPassword(view, "different-password");
    await view.find("#password-form").trigger("submit");
    expect(view.find("#confirmation-error").text()).toContain("no coinciden");
    expect(mocks.updateOwnCredentials).not.toHaveBeenCalled();
    await view.find('[aria-label="Nueva contrasena"]').setValue("short");
    await view.find("#password-form").trigger("submit");
    expect(view.find("#newPassword-error").text()).toContain("12 caracteres");
  });

  it("cambia la contrasena y cierra la sesion local para iniciar sesion de nuevo", async () => {
    const view = await render();
    await fillPassword(view);
    await view.find("#password-form").trigger("submit");
    await flushPromises();
    expect(mocks.updateOwnCredentials).toHaveBeenCalledWith({ currentPassword: "current-password", newPassword: "new-secure-password" });
    expect(staffSession.value).toBeNull();
    expect(localStorage.getItem("xtechjs.staff-session")).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith({ name: "staff.login", query: { passwordChanged: "1" } });
  });

  it("permite mostrar y ocultar la contrasena sin perder su valor", async () => {
    const view = await render();
    await view.find('[aria-label="Nueva contrasena"]').setValue("new-secure-password");
    await view.find('[aria-label="Mostrar nueva contrasena"]').trigger("click");
    expect(view.find('[aria-label="Nueva contrasena"]').attributes("type")).toBe("text");
    await view.find('[aria-label="Ocultar nueva contrasena"]').trigger("click");
    expect(view.find('[aria-label="Nueva contrasena"]').attributes("type")).toBe("password");
  });

  it("expulsa una sesion caducada al consultar el perfil", async () => {
    mocks.getOwnProfile.mockRejectedValueOnce(new OwnProfileRequestError("Sesion caducada", 401));
    await render();
    expect(staffSession.value).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith({ name: "staff.login" });
  });

  it("avisa al navegar con cambios sin guardar", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const view = await render();
    await view.find('[aria-label="Nuevo email"]').setValue("unsaved@example.test");
    const guard = mocks.leaveGuard.mock.calls[0][0] as () => boolean;
    expect(guard()).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("no reemplaza otra sesion si llega una respuesta tardia", async () => {
    let resolveUpdate!: (value: unknown) => void;
    mocks.updateOwnCredentials.mockReturnValueOnce(new Promise((resolve) => { resolveUpdate = resolve; }));
    const view = await render();
    await view.find('[aria-label="Nuevo email"]').setValue("new@example.test");
    await view.find('[aria-label="Contrasena actual para email"]').setValue("current-password");
    await view.find("#email-form").trigger("submit");
    setStaffSession({ accessToken: "other-token", user: { ...user, id: "other-staff" } });
    resolveUpdate({ accessToken: "renewed-token", user: { ...user, email: "new@example.test" } });
    await flushPromises();
    expect(staffSession.value?.accessToken).toBe("other-token");
  });
});