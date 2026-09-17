import assert from "node:assert/strict";
import test from "node:test";
import type { Payment } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";
import { RefundPayment } from "./refund-payment.js";

test("creates a rectification with a normalized mandatory reason", async () => {
  let received: { originalPaymentId: string; reason: string } | undefined;
  const repository = {
    createRectification: async (originalPaymentId: string, input: { id: string; reason: string }) => {
      received = { originalPaymentId, reason: input.reason };
      return { id: input.id } as Payment;
    }
  } as PaymentRepository;

  const result = await new RefundPayment(repository).execute("payment-1", "  Material devuelto  ");

  assert.equal(received?.originalPaymentId, "payment-1");
  assert.equal(received?.reason, "Material devuelto");
  assert.ok(result?.id);
});

test("rejects a rectification without a reason", async () => {
  const repository = {} as PaymentRepository;
  await assert.rejects(() => new RefundPayment(repository).execute("payment-1", "   "), /reason is required/);
});