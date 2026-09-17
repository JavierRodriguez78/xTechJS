import assert from "node:assert/strict";
import test from "node:test";
import type { CustomerCommunicationRepository } from "./customer-communication-repository.js";
import { ListCustomerCommunications } from "./list-customer-communications.js";

test("lists customer communications from newest to oldest", async () => {
  const repository: CustomerCommunicationRepository = {
    async findByCustomerId() {
      return [
        { id: "old", type: "registration_invitation", recipient: "customer@example.com", status: "sent", subject: "Invitacion de registro", reference: null, errorMessage: null, createdAt: new Date("2026-09-15T10:00:00Z") },
        { id: "new", type: "invoice_email", recipient: "customer@example.com", status: "failed", subject: "Factura B-000001", reference: "B-000001", errorMessage: "SMTP unavailable", createdAt: new Date("2026-09-17T10:00:00Z") }
      ];
    }
  };

  const result = await new ListCustomerCommunications(repository).execute("customer-1");

  assert.deepEqual(result.map((communication) => communication.id), ["new", "old"]);
});