import assert from "node:assert/strict";
import test from "node:test";
import type { MailerService } from "@xtaskjs/mailer";
import type { Customer } from "../../customers/domain/customer.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairOrder } from "../../repairs/domain/repair-order.js";
import type { NotificationTemplate } from "../domain/notification-template.js";
import type { CustomerNotificationRecord, CustomerNotificationRepository, CustomerNotificationStatus } from "./customer-notification-repository.js";
import type { NotificationTemplateRepository } from "./notification-template-repository.js";
import { NotifyRepairStatusChange } from "./notify-repair-status-change.js";

const repair: RepairOrder = {
  id: "repair-1",
  customerId: "customer-1",
  deviceType: "Consola",
  brand: "Sony",
  model: "PS5",
  serialNumber: null,
  reportedIssue: "No enciende",
  deliveredAccessories: null,
  technicianId: null,
  diagnosis: null,
  status: "repaired",
  createdAt: new Date(),
  updatedAt: new Date()
};

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "customer-1",
    displayName: "Ada Lovelace",
    email: "ada@example.com",
    phone: null,
    address: null,
    taxId: null,
    internalNotes: null,
    registrationStatus: "completed",
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

function template(overrides: Partial<NotificationTemplate> = {}): NotificationTemplate {
  return {
    key: "repair.status.repaired",
    subject: "Tu {{deviceBrand}} {{deviceModel}} ya esta listo",
    body: "Hola {{customerName}}, {{statusNote}}",
    enabled: true,
    updatedAt: new Date(),
    ...overrides
  };
}

function harness(options: { template?: NotificationTemplate; customer?: Customer; sendMail?: MailerService["sendMail"] }) {
  const records: CustomerNotificationRecord[] = [];
  const deliveries: { id: string; status: CustomerNotificationStatus; error?: string }[] = [];
  const sent: { to: string; subject: string; text?: string }[] = [];

  const templates: NotificationTemplateRepository = {
    async findAll() { return options.template ? [options.template] : []; },
    async findByKey(key) { return options.template?.key === key ? options.template : undefined; },
    async save() { throw new Error("not used"); },
    async remove() { return false; }
  };
  const notifications: CustomerNotificationRepository = {
    async record(input) {
      const record: CustomerNotificationRecord = { id: `notification-${records.length + 1}`, createdAt: new Date(), errorMessage: input.errorMessage ?? null, ...input };
      records.push(record);
      return record;
    },
    async markDelivery(id, status, errorMessage) { deliveries.push({ id, status, error: errorMessage }); }
  };
  const customers = { async findById() { return options.customer; } } as unknown as CustomerRepository;
  const mailer = {
    sendMail: options.sendMail ?? (async (message: { to: string; subject: string; text?: string }) => { sent.push(message); })
  } as unknown as MailerService;

  return { service: new NotifyRepairStatusChange(templates, notifications, customers, mailer), records, deliveries, sent };
}

test("a configured template is rendered and delivered to the customer", async () => {
  const { service, records, deliveries, sent } = harness({ template: template(), customer: customer() });

  const outcome = await service.execute(repair, "Cambiada la fuente de alimentacion");

  assert.equal(outcome, "sent");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "ada@example.com");
  assert.equal(sent[0].subject, "Tu Sony PS5 ya esta listo");
  assert.equal(sent[0].text, "Hola Ada Lovelace, Cambiada la fuente de alimentacion");
  assert.deepEqual(records.map((record) => [record.templateKey, record.status]), [["repair.status.repaired", "pending"]]);
  assert.deepEqual(deliveries, [{ id: "notification-1", status: "sent", error: undefined }]);
});

test("a status without template sends nothing and leaves no record", async () => {
  const { service, records, sent } = harness({ template: template({ key: "repair.status.delivered" }), customer: customer() });

  assert.equal(await service.execute(repair), "no-template");
  assert.deepEqual(records, []);
  assert.deepEqual(sent, []);
});

test("a disabled template sends nothing", async () => {
  const { service, records, sent } = harness({ template: template({ enabled: false }), customer: customer() });

  assert.equal(await service.execute(repair), "template-disabled");
  assert.deepEqual(records, []);
  assert.deepEqual(sent, []);
});

test("a customer without email is skipped without recording a phantom delivery", async () => {
  const { service, records } = harness({ template: template(), customer: customer({ email: null }) });

  assert.equal(await service.execute(repair), "no-recipient");
  assert.deepEqual(records, []);
});

test("an SMTP failure is recorded as failed and never propagated", async () => {
  const { service, deliveries } = harness({
    template: template(),
    customer: customer(),
    sendMail: (async () => { throw new Error("Connection refused"); }) as unknown as MailerService["sendMail"]
  });

  assert.equal(await service.execute(repair), "failed");
  assert.deepEqual(deliveries, [{ id: "notification-1", status: "failed", error: "Connection refused" }]);
});
