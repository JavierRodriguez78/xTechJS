import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import IntegrationApiKeysView from "./IntegrationApiKeysView.vue";

const { createIntegrationApiKey, listIntegrationApiKeys, revokeIntegrationApiKey } = vi.hoisted(() => ({ createIntegrationApiKey: vi.fn(), listIntegrationApiKeys: vi.fn(), revokeIntegrationApiKey: vi.fn() }));
vi.mock("../api", () => ({ createIntegrationApiKey, listIntegrationApiKeys, revokeIntegrationApiKey }));

describe("gestión de claves de integración", () => {
  it("muestra la clave generada una sola vez en el resultado de creación", async () => {
    const firstKey = { id: "key-1", name: "repuestos-watch", scope: "spare-parts-catalog:write", active: true, createdAt: "2026-10-03T10:00:00Z", lastUsedAt: null };
    const newKey = { id: "key-2", name: "repuestos-watch-dev", scope: "spare-parts-catalog:write", active: true, createdAt: "2026-10-03T10:00:00Z", lastUsedAt: null };
    listIntegrationApiKeys.mockResolvedValueOnce([firstKey]).mockResolvedValueOnce([firstKey, newKey]);
    createIntegrationApiKey.mockResolvedValue({ key: "xtech_once_only_secret", integration: { id: "key-2", name: "repuestos-watch-dev", scope: "spare-parts-catalog:write", active: true, createdAt: "2026-10-03T10:00:00Z", lastUsedAt: null } });
    const wrapper = mount(IntegrationApiKeysView);
    await flushPromises();
    await wrapper.find("input").setValue("repuestos-watch-dev");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(createIntegrationApiKey).toHaveBeenCalledWith("repuestos-watch-dev");
    expect(wrapper.text()).toContain("xtech_once_only_secret");
    expect(wrapper.text()).toContain("no volverá a mostrarse");
    expect(wrapper.findAll("tbody tr")).toHaveLength(2);
  });
});
