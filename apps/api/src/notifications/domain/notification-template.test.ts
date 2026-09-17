import assert from "node:assert/strict";
import test from "node:test";
import { renderNotificationTemplate, renderNotificationText, repairStatusTemplateKey } from "./notification-template.js";

test("a repair status maps to its template key", () => {
  assert.equal(repairStatusTemplateKey("repaired"), "repair.status.repaired");
  assert.equal(repairStatusTemplateKey("awaiting-parts"), "repair.status.awaiting-parts");
});

test("known placeholders are replaced, with or without inner spacing", () => {
  const text = renderNotificationText("Hola {{customerName}}, tu {{ deviceBrand }} {{deviceModel}} esta {{status}}.", {
    customerName: "Ada",
    deviceBrand: "Sony",
    deviceModel: "PS5",
    status: "repaired"
  });

  assert.equal(text, "Hola Ada, tu Sony PS5 esta repaired.");
});

test("an unknown placeholder never reaches the customer as raw text", () => {
  assert.equal(renderNotificationText("Hola {{nombreCliente}}.", { customerName: "Ada" }), "Hola .");
});

test("a placeholder without value renders empty instead of the literal marker", () => {
  assert.equal(renderNotificationText("Nota: {{statusNote}}", {}), "Nota: ");
});

test("rendering a template trims subject and body", () => {
  const rendered = renderNotificationTemplate(
    { key: "repair.status.repaired", subject: "  {{deviceBrand}} listo  ", body: "  Hola {{customerName}}  ", enabled: true, updatedAt: new Date() },
    { customerName: "Ada", deviceBrand: "Sony" }
  );

  assert.deepEqual(rendered, { subject: "Sony listo", body: "Hola Ada" });
});
