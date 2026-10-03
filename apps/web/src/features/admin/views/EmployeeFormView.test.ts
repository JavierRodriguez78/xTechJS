import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeFormView from "./EmployeeFormView.vue";
import { staffSession } from "../../auth/session";

const api = vi.hoisted(() => ({ createEmployee: vi.fn(), getEmployeeNationalId: vi.fn(), listEmployees: vi.fn(), listStores: vi.fn(), listAccessibleStores: vi.fn(), updateEmployee: vi.fn(), push: vi.fn() }));
const route = { params: {} as Record<string, string> };
vi.mock("../api", () => api);
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ push: api.push }) }));
vi.mock("../../auth/session", async () => { const { ref } = await import("vue"); return { staffSession: ref(null) }; });

const storeA = { id: "00000000-0000-4000-8000-000000000001", name: "Centro", active: true };
const storeB = { id: "00000000-0000-4000-8000-000000000002", name: "Norte", active: true };
const employee = { id: "00000000-0000-4000-8000-000000000101", email: "ana@example.test", displayName: "Ana", role: "technician" as const, storeId: storeA.id, defaultStoreId: storeA.id, storeAccess: [storeA.id, storeB.id], active: true, phone: "600000000", addressCountry: "España", addressStreet: "Calle Uno" };
let wrapper: ReturnType<typeof mount> | undefined;
async function render() {
  wrapper = mount(EmployeeFormView, { global: { stubs: { RouterLink: true, AddressFields: true } } });
  await flushPromises();
  return wrapper;
}

describe("formulario de empleado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params = {};
    staffSession.value = { accessToken: "admin-token", user: { id: "admin-id", email: "admin@example.test", displayName: "Admin", role: "admin", storeId: null } };
    api.listStores.mockResolvedValue([storeA, storeB]);
    api.listAccessibleStores.mockResolvedValue([storeA, storeB]);
    api.listEmployees.mockResolvedValue([employee]);
    api.createEmployee.mockResolvedValue({ ...employee });
    api.updateEmployee.mockResolvedValue({ ...employee });
    api.getEmployeeNationalId.mockResolvedValue({ nationalId: "12345678Z" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("crea un tecnico con tienda por defecto y acceso a varias tiendas", async () => {
    const view = await render();
    await view.find('input[autocomplete="name"]').setValue("Eva Tecnica");
    await view.find('input[autocomplete="email"]').setValue("eva@example.test");
    await view.find('input[autocomplete="new-password"]').setValue("secure-password-123");
    const options = view.findAll(".store-option input");
    expect(options).toHaveLength(2);
    await options[1].setValue(true);
    await view.find("form").trigger("submit");
    await flushPromises();
    expect(api.createEmployee).toHaveBeenCalledWith(expect.objectContaining({
      email: "eva@example.test", role: "technician", defaultStoreId: storeA.id, storeAccess: [storeA.id, storeB.id], password: "secure-password-123"
    }));
    expect(api.createEmployee.mock.calls[0][0]).not.toHaveProperty("nationalId");
    expect(api.push).toHaveBeenCalledWith({ name: "admin.employees.list" });
  });

  it("recoge el DNI opcional durante el alta sin mostrarlo por defecto", async () => {
    const view = await render();
    const nationalId = view.find('input[autocomplete="off"]');
    expect(nationalId.attributes("type")).toBe("password");
    await nationalId.setValue("12345678Z");
    await view.find('input[autocomplete="name"]').setValue("Eva");
    await view.find('input[autocomplete="email"]').setValue("eva@example.test");
    await view.find('input[autocomplete="new-password"]').setValue("secure-password-123");
    await view.find("form").trigger("submit");
    await flushPromises();
    expect(api.createEmployee.mock.calls[0][0].nationalId).toBe("12345678Z");
  });

  it("marca el administrador global con alcance null y permite admin limitado", async () => {
    const view = await render();
    await view.find('[aria-label="Rol"]');
    await view.find('[aria-label="Rol"]').setValue("admin");
    expect((view.find(".global-toggle input").element as HTMLInputElement).checked).toBe(false);
    await view.find(".global-toggle input").setValue(true);
    expect(view.find(".store-options").exists()).toBe(false);
    await view.find(".global-toggle input").setValue(false);
    expect(view.find(".store-options").exists()).toBe(true);
  });

  it("edita sin mostrar DNI/NIE y consulta el dato solo con acción explícita", async () => {
    route.params = { id: employee.id };
    const view = await render();
    expect(api.getEmployeeNationalId).not.toHaveBeenCalled();
    expect(view.find('[aria-label="DNI/NIE oculto"]').exists()).toBe(true);
    await view.find('[aria-label="Consultar DNI/NIE"]').trigger("click");
    await flushPromises();
    expect(api.getEmployeeNationalId).toHaveBeenCalledWith(employee.id);
    expect((view.find('input[autocomplete="off"]').element as HTMLInputElement).value).toBe("12345678Z");
  });

  it("permite cambiar tiendas y conserva la principal como predeterminada", async () => {
    route.params = { id: employee.id };
    const view = await render();
    const options = view.findAll(".store-option input");
    expect((options[0].element as HTMLInputElement).checked).toBe(true);
    expect((options[1].element as HTMLInputElement).checked).toBe(true);
    await options[1].setValue(false);
    await view.find("form").trigger("submit");
    await flushPromises();
    expect(api.updateEmployee).toHaveBeenCalledWith(employee.id, expect.objectContaining({ defaultStoreId: storeA.id, storeAccess: [storeA.id] }));
    expect(api.updateEmployee.mock.calls[0][1]).not.toHaveProperty("nationalId");
  });

  it("solo actualiza el DNI si fue consultado expresamente", async () => {
    route.params = { id: employee.id };
    const view = await render();
    await view.find("form").trigger("submit");
    await flushPromises();
    expect(api.updateEmployee.mock.calls[0][1]).not.toHaveProperty("nationalId");
    await view.find('[aria-label="Consultar DNI/NIE"]').trigger("click");
    await flushPromises();
    await view.find("form").trigger("submit");
    await flushPromises();
    expect(api.updateEmployee.mock.calls[1][1].nationalId).toBe("12345678Z");
  });

  it("pide confirmación antes de dar de baja a otro empleado", async () => {
    route.params = { id: employee.id };
    const view = await render();
    await view.find(".status-action").trigger("click");
    await flushPromises();
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(api.updateEmployee).toHaveBeenCalledWith(employee.id, { active: false });
  });

  it("no ofrece auto-baja en el perfil del usuario actual", async () => {
    route.params = { id: employee.id };
    staffSession.value = { accessToken: "admin-token", user: { id: employee.id, email: employee.email, displayName: employee.displayName, role: "technician", storeId: employee.storeId } };
    const view = await render();
    expect(view.find(".status-action").attributes("disabled")).toBeDefined();
  });
});
