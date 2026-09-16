import assert from "node:assert/strict";
import test from "node:test";
import type { ChatMessageRepository } from "./chat-message-repository.js";
import type { RepairOrderRepository } from "../../repairs/application/repair-order-repository.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import { SendChatMessage } from "./send-chat-message.js";
import { SendOwnCustomerChatMessage } from "./send-own-customer-chat-message.js";

function fakeSockets() {
  const emitted: unknown[] = [];
  return { emitted, emit(...args: unknown[]) { emitted.push(args); } };
}

test("a chat message is persisted and broadcast when the repair order exists", async () => {
  const saved: unknown[] = [];
  const chatMessages: ChatMessageRepository = {
    async create(input) { saved.push(input); return { ...input, createdAt: new Date() }; },
    async listByRepairOrder() { return []; }
  };
  const repairs = { async findById() { return { id: "repair-1", customerId: "customer-1" }; } } as unknown as RepairOrderRepository;
  const sockets = fakeSockets();

  const message = await new SendChatMessage(chatMessages, repairs, sockets as never).execute({
    repairOrderId: "repair-1",
    senderId: "user-1",
    senderRole: "technician",
    senderName: "tech@example.com",
    body: "  Hola, ¿cómo va la reparación?  "
  });

  assert.equal(message?.body, "Hola, ¿cómo va la reparación?");
  assert.equal(saved.length, 1);
  assert.equal(sockets.emitted.length, 2);
});

test("a chat message is rejected when the repair order does not exist", async () => {
  const chatMessages: ChatMessageRepository = { async create() { throw new Error("must not persist"); }, async listByRepairOrder() { return []; } };
  const repairs = { async findById() { return undefined; } } as unknown as RepairOrderRepository;
  const sockets = fakeSockets();

  const message = await new SendChatMessage(chatMessages, repairs, sockets as never).execute({
    repairOrderId: "missing", senderId: "user-1", senderRole: "admin", senderName: "admin@example.com", body: "hola"
  });

  assert.equal(message, undefined);
});

test("a customer cannot send a chat message on a repair order they do not own", async () => {
  const chatMessages: ChatMessageRepository = { async create() { throw new Error("must not persist"); }, async listByRepairOrder() { return []; } };
  const repairs = { async findById() { return { id: "repair-1", customerId: "customer-owner" }; } } as unknown as RepairOrderRepository;
  const customers = { async findByEmail() { return { id: "customer-other", displayName: "Otro cliente" }; } } as unknown as CustomerRepository;
  const sockets = fakeSockets();
  const sendChatMessage = new SendChatMessage(chatMessages, repairs, sockets as never);

  const message = await new SendOwnCustomerChatMessage(customers, repairs, sendChatMessage).execute("repair-1", "other@example.com", "hola");

  assert.equal(message, undefined);
});
