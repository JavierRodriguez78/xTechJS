import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RepairStatusDonut from "./RepairStatusDonut.vue";

describe("gráfico de reparaciones por estado", () => {
  it("presenta el total, el valor por estado y la proporción del gráfico", () => {
    const wrapper = mount(RepairStatusDonut, { props: { items: [{ status: "received", count: 3 }, { status: "repairing", count: 1 }] } });

    expect(wrapper.get(".dashboard-donut").attributes("aria-label")).toBe("Distribución por estado: 4 reparaciones");
    expect(wrapper.get(".dashboard-donut-center").text()).toContain("4");
    expect(wrapper.text()).toContain("Recibido");
    expect(wrapper.text()).toContain("En reparación");
    expect(wrapper.text()).toContain("75%");
    expect(wrapper.text()).toContain("25%");
    expect(wrapper.get(".dashboard-donut").attributes("style")).toContain("conic-gradient");
  });

  it("mantiene un estado vacío legible sin dividir por cero", () => {
    const wrapper = mount(RepairStatusDonut, { props: { items: [] } });

    expect(wrapper.get(".dashboard-donut").attributes("aria-label")).toBe("Distribución por estado: 0 reparaciones");
    expect(wrapper.get(".dashboard-donut-center").text()).toContain("0");
    expect(wrapper.text()).toContain("No hay reparaciones en este periodo.");
  });
});
