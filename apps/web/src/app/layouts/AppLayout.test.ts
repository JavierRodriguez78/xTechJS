import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import AppLayout from "./AppLayout.vue";
import { staffSession } from "../../features/auth/session";

const mocks = vi.hoisted(() => ({ getSessionStore: vi.fn(), signOut: vi.fn(), start: vi.fn(), stop: vi.fn() }));
vi.mock("../../features/auth/session", async () => {
  const { ref } = await import("vue");
  return { staffSession: ref(null), signOut: mocks.signOut };
});
vi.mock("../../features/admin/api", () => ({ getSessionStore: mocks.getSessionStore }));
vi.mock("../../features/chat/notifications", () => ({ startChatNotifications: mocks.start, stopChatNotifications: mocks.stop, totalChatUnread: () => 2 }));

const routeNames = ["customers.list", "repairs.list", "repairs.detail.chat", "inventory.list", "inventory.catalog.list", "inventory.catalog.detail", "admin.integrations", "inventory.alerts", "suppliers.list", "purchase-orders.list", "payments.list", "payments.cash-register", "payments.reports", "trade-in.list", "ecommerce.products.list", "ecommerce.orders", "dashboard.attention", "dashboard.inventory", "dashboard.sales", "admin.dashboard", "admin.stores.list", "admin.stores.edit", "admin.users.list", "admin.employees.list", "admin.employees.create", "admin.employees.edit", "admin.audit.list", "admin.config.statuses", "admin.config.devices", "admin.config.templates", "staff.profile", "staff.login"];
let wrapper: ReturnType<typeof mount> | undefined;
const originalWidth = window.innerWidth;

async function render(name = "customers.list") {
  const router = createRouter({ history: createMemoryHistory(), routes: routeNames.map((routeName) => ({ name: routeName, path: `/${routeName.replace(/\./g, "/")}`, component: { template: "<div>Vista actual</div>" } })) });
  await router.push({ name });
  await router.isReady();
  wrapper = mount(AppLayout, { global: { plugins: [router], stubs: { ChatToastStack: true } } });
  await flushPromises();
  return { view: wrapper, router };
}

describe("navegacion de la aplicacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    staffSession.value = { accessToken: "test", user: { id: "admin-1", displayName: "Ana Administradora", email: "ana@example.test", role: "admin", storeId: null } };
    mocks.getSessionStore.mockResolvedValue({ id: "store-1", name: "Taller Centro", active: true });
    mocks.signOut.mockImplementation(() => { staffSession.value = null; });
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    Object.defineProperty(window, "innerWidth", { value: originalWidth, writable: true, configurable: true });
    vi.useRealTimers();
  });

  it("muestra solo el submenu del grupo seleccionado y permite navegar", async () => {
    const { view, router } = await render();
    expect(view.findAll(".main-navigation button")).toHaveLength(4);
    expect(view.find(".section-navigation").text()).toContain("Clientes");
    expect(view.find(".section-navigation").text()).not.toContain("Tiendas");
    await view.find('[aria-label="Ventas"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("dashboard.sales");
    expect(view.find(".section-sidebar").classes()).toContain("collapsed");
    expect(view.find('.section-navigation a[aria-label="Resumen"]').exists()).toBe(true);
    expect(view.find('.section-navigation a[aria-label="Caja"]').exists()).toBe(true);
    expect(view.find('.section-navigation a[aria-label="Clientes"]').exists()).toBe(false);
    await view.find('.section-navigation a[aria-label="Compraventa"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("trade-in.list");
  });

  it("sigue las rutas profundas y destaca la opcion exacta", async () => {
    const { view, router } = await render("admin.stores.edit");
    expect(view.find('[aria-label="Administracion"]').attributes("aria-pressed")).toBe("true");
    expect(view.find('.section-current').attributes("aria-label")).toBe("Tiendas");
    await router.push({ name: "inventory.alerts" });
    await flushPromises();
    expect(view.find('.section-current').attributes("aria-label")).toBe("Alertas de stock");
    expect(view.find('.section-current').attributes("aria-current")).toBe("page");
  });

  it("pliega a iconos accesibles y conserva la preferencia al elegir grupo", async () => {
    const { view, router } = await render();
    await view.find('[aria-label="Plegar menu lateral"]').trigger("click");
    expect(view.find(".section-sidebar").classes()).toContain("collapsed");
    expect(view.findAll(".item-label")).toHaveLength(0);
    expect(view.find('.section-navigation a[aria-label="Clientes"] .nav-tooltip').text()).toBe("Clientes");
    expect(localStorage.getItem("xtechjs.navigation.collapsed")).toBe("true");
    await view.find('[aria-label="Ventas"]').trigger("click");
    expect(view.find(".section-sidebar").classes()).toContain("collapsed");
    expect(view.find('.section-navigation a[aria-label="Caja"] .nav-tooltip').text()).toBe("Caja");
  });

  it("identifica la vista de administrador sin consultar ninguna tienda", async () => {
    const { view } = await render("admin.dashboard");
    expect(view.find(".session-context").text()).toBe("Vista de administrador");
    expect(mocks.getSessionStore).not.toHaveBeenCalled();
    expect(view.find(".account-popover").text()).toContain("ana@example.test");
  });

  it("muestra la tienda del empleado y oculta modulos sin permiso", async () => {
    staffSession.value = { accessToken: "test", user: { id: "tech-1", displayName: "Eva Tecnica", email: "eva@example.test", role: "technician", storeId: "store-1" } };
    const { view, router } = await render();
    expect(view.find(".session-context").text()).toBe("Taller Centro");
    expect(mocks.getSessionStore).toHaveBeenCalledOnce();
    expect(view.findAll(".main-navigation button")).toHaveLength(4);
    expect(view.find('.main-navigation [aria-label="Administracion"]').exists()).toBe(true);
    await view.find('[aria-label="Administracion"]').trigger("click");
    await flushPromises();
    expect(view.find(".section-navigation").text()).toContain("Integraciones");
    expect(view.find(".section-navigation").text()).not.toContain("Empleados");
    expect(view.find(".section-navigation").text()).not.toContain("Tiendas");
    expect(router.currentRoute.value.name).toBe("admin.integrations");
    expect(view.find('.main-navigation [aria-label="Almacen"]').exists()).toBe(true);
    await view.find('[aria-label="Almacen"]').trigger("click");
    expect(view.find(".section-navigation").text()).toContain("Materiales");
    expect(view.find(".section-navigation").text()).toContain("Ordenes de compra");
    await view.find('[aria-label="Ventas"]').trigger("click");
    expect(view.find(".section-navigation").text()).toContain("TPV");
    expect(view.find(".section-navigation").text()).not.toContain("Compraventa");
  });

  it("un administrador limitado solo ve administracion de empleados y modulos de tienda", async () => {
    staffSession.value = { accessToken: "test", user: { id: "store-admin", displayName: "Admin Centro", email: "centro@example.test", role: "admin", storeId: "store-1", defaultStoreId: "store-1", storeAccess: ["store-1"] } };
    const { view } = await render("admin.employees.list");
    expect(view.find(".main-navigation").text()).toContain("Administracion");
    await view.find('[aria-label="Administracion"]').trigger("click");
    expect(view.find(".section-navigation").text()).toContain("Empleados");
    expect(view.find(".section-navigation").text()).toContain("Panel");
    expect(view.find(".section-navigation").text()).not.toContain("Tiendas");
    expect(view.find(".section-navigation").text()).not.toContain("Auditoria");
    expect(view.find('.main-navigation button[aria-label="Ventas"]').exists()).toBe(true);
  });

  it("indica un fallo de tienda y no lo presenta como vista administrativa", async () => {
    staffSession.value = { accessToken: "test", user: { id: "tech-1", displayName: "Eva", email: "eva@example.test", role: "technician", storeId: "store-1" } };
    mocks.getSessionStore.mockRejectedValueOnce(new Error("Offline"));
    const { view } = await render();
    expect(view.find(".session-context").text()).toBe("No se pudo cargar la tienda");
  });

  it("ignora una respuesta antigua si la sesion cambia", async () => {
    let resolveStore!: (value: { id: string; name: string; active: boolean }) => void;
    mocks.getSessionStore.mockReturnValueOnce(new Promise((resolve) => { resolveStore = resolve; }));
    staffSession.value = { accessToken: "test", user: { id: "tech-1", displayName: "Eva", email: "eva@example.test", role: "technician", storeId: "store-1" } };
    const { view } = await render();
    staffSession.value = { accessToken: "test", user: { id: "admin-1", displayName: "Ana", email: "ana@example.test", role: "admin", storeId: null } };
    await nextTick();
    resolveStore({ id: "store-1", name: "Tienda anterior", active: true });
    await flushPromises();
    expect(view.find(".session-context").text()).toBe("Vista de administrador");
  });

  it("en movil abre sobre el contenido y se pliega al seleccionar una opcion", async () => {
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true, configurable: true });
    const { view } = await render();
    expect(view.find(".section-sidebar").classes()).toContain("collapsed");
    await view.find('[aria-label="Ventas"]').trigger("click");
    expect(view.find(".section-sidebar").classes()).toContain("collapsed");
    expect(view.find(".sidebar-backdrop").exists()).toBe(false);
    await view.find('[aria-label="Expandir menu lateral"]').trigger("click");
    expect(view.find(".sidebar-backdrop").exists()).toBe(true);
    await view.find('.section-navigation a[aria-label="Caja"]').trigger("click");
    await flushPromises();
    expect(view.find(".section-sidebar").classes()).toContain("collapsed");
    expect(view.find(".sidebar-backdrop").exists()).toBe(false);
  });

  it("cierra la sesion y vuelve al acceso interno", async () => {
    const { view, router } = await render();
    await view.find('[aria-label="Cerrar sesion"]').trigger("click");
    await flushPromises();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.stop).toHaveBeenCalled();
    expect(router.currentRoute.value.name).toBe("staff.login");
  });

  it("el desplegable de usuario enlaza con el perfil propio", async () => {
    const { view, router } = await render();
    await view.find(".account-popover a").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("staff.profile");
  });

  it("actualiza dia y hora y limpia el temporizador al desmontar", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    const { view } = await render();
    expect(view.find(".workspace-clock").text()).toContain("3 de octubre de 2026");
    expect(view.find(".workspace-clock strong").text()).toBe("12:00:00");
    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(view.find(".workspace-clock strong").text()).toBe("12:00:02");
    view.unmount();
    wrapper = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });
});