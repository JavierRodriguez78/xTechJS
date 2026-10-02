import assert from "node:assert/strict";
import test from "node:test";
import type { RepairAttachmentRepository } from "../../attachments/application/repair-attachment-repository.js";
import type { TradeInRequest } from "../domain/trade-in-request.js";
import { NotifyTradeInSubmission } from "./notify-trade-in-submission.js";
import { TradeInPhotoRequiredError, TradeInService } from "./trade-in-service.js";

function draft(): TradeInRequest {
  return {
    id: "trade-in-1",
    customerId: "customer-1",
    deviceType: "console",
    brand: "Acme",
    model: "One",
    conditionDescription: "Working",
    status: "draft",
    proposedAmountCents: null,
    proposalNote: null,
    finalAmountCents: null,
    decidedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

const noOpNotifier = { async execute() {} } as unknown as NotifyTradeInSubmission;

function serviceWithAttachments(mimeTypes: readonly string[], submissionNotifier: NotifyTradeInSubmission = noOpNotifier): { service: TradeInService; saved: TradeInRequest[] } {
  const saved: TradeInRequest[] = [];
  const attachments = {
    async listByTradeInRequest() {
      return mimeTypes.map((mimeType, index) => ({ id: `attachment-${index}`, mimeType }));
    }
  } as unknown as RepairAttachmentRepository;
  const service = new TradeInService(attachments, submissionNotifier);
  const request = draft();
  const dataSource = {
    getRepository() {
      return {
        async findOneBy(criteria: { id: string; customerId: string }) {
          return criteria.id === request.id && criteria.customerId === request.customerId ? request : undefined;
        },
        async save(value: TradeInRequest) {
          saved.push(value);
          return value;
        }
      };
    }
  };
  (service as unknown as { dataSource: unknown }).dataSource = dataSource;
  return { service, saved };
}

test("a draft trade-in request cannot be submitted without a photo", async () => {
  const { service } = serviceWithAttachments(["application/pdf"]);

  await assert.rejects(() => service.submit("trade-in-1", "customer-1"), TradeInPhotoRequiredError);
});

test("a draft trade-in request with a photo becomes submitted", async () => {
  const { service, saved } = serviceWithAttachments(["application/pdf", "image/jpeg"]);

  const result = await service.submit("trade-in-1", "customer-1");

  assert.equal(result?.status, "submitted");
  assert.equal(saved.length, 1);
});

test("submitting a trade-in request notifies the staff after it is persisted", async () => {
  const notified: TradeInRequest[] = [];
  const notifier = {
    async execute(request: TradeInRequest) { notified.push(request); }
  } as NotifyTradeInSubmission;
  const { service } = serviceWithAttachments(["image/jpeg"], notifier);

  await service.submit("trade-in-1", "customer-1");

  assert.deepEqual(notified.map((request) => request.status), ["submitted"]);
});

test("completing an accepted trade-in records its outgoing payment", async () => {
  const request = { ...draft(), status: "accepted" as const };
  const payouts: { tradeInRequestId: string; amountCents: number; method: string; reference: string | null; paidAt: Date }[] = [];
  const requestRepository = {
    async findOne() { return request; },
    async save(value: TradeInRequest) { return value; }
  };
  const payoutRepository = {
    async save(value: typeof payouts[number]) { payouts.push(value); return value; }
  };
  const service = new TradeInService({} as RepairAttachmentRepository, noOpNotifier);
  (service as unknown as { dataSource: unknown }).dataSource = {
    async transaction<T>(operation: (manager: unknown) => Promise<T>): Promise<T> {
      const repositories: unknown[] = [requestRepository, payoutRepository];
      return operation({ getRepository: () => repositories.shift() });
    }
  };

  const result = await service.complete(request.id, 14500, "bank_transfer", "SEPA-2026-001");

  assert.equal(result?.status, "completed");
  assert.equal(result?.finalAmountCents, 14500);
  assert.ok(result?.completedAt instanceof Date);
  assert.deepEqual(payouts.map(({ tradeInRequestId, amountCents, method, reference }) => ({ tradeInRequestId, amountCents, method, reference })), [{
    tradeInRequestId: request.id,
    amountCents: 14500,
    method: "bank_transfer",
    reference: "SEPA-2026-001"
  }]);
  assert.ok(payouts[0]?.paidAt instanceof Date);
});
