import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { TradeInPayout, TradeInPayoutMethod, TradeInRequest, TradeInStatus } from "../domain/trade-in-request.js";
import { TradeInPayoutEntitySchema, TradeInRequestEntitySchema } from "../infrastructure/persistence/trade-in-entity.js";
import type { RepairAttachmentRepository } from "../../attachments/application/repair-attachment-repository.js";
import { NotifyTradeInSubmission } from "./notify-trade-in-submission.js";

export interface CreateTradeInRequestInput { deviceType: TradeInRequest["deviceType"]; brand: string; model: string; conditionDescription: string; }
export class TradeInTransitionError extends Error {}
export class TradeInPhotoRequiredError extends Error {}

@Traceable("TradeInService")
@Service()
export class TradeInService {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  constructor(@Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository, private readonly submissionNotifier: NotifyTradeInSubmission) {}

  create(customerId: string, input: CreateTradeInRequestInput): Promise<TradeInRequest> { return this.dataSource.getRepository(TradeInRequestEntitySchema).save({ id: randomUUID(), customerId, ...input, brand: input.brand.trim(), model: input.model.trim(), conditionDescription: input.conditionDescription.trim(), status: "draft", proposedAmountCents: null, proposalNote: null, finalAmountCents: null, decidedAt: null, completedAt: null }); }
  listOwn(customerId: string): Promise<readonly TradeInRequest[]> { return this.dataSource.getRepository(TradeInRequestEntitySchema).find({ where: { customerId }, order: { createdAt: "DESC" } }); }
  findOwn(id: string, customerId: string): Promise<TradeInRequest | undefined> { return this.dataSource.getRepository(TradeInRequestEntitySchema).findOneBy({ id, customerId }).then((request) => request ?? undefined); }
  async list(status?: TradeInStatus): Promise<readonly TradeInRequest[]> { const query = this.dataSource.getRepository(TradeInRequestEntitySchema).createQueryBuilder("trade_in_request").where("trade_in_request.status <> :draft", { draft: "draft" }); if (status) query.andWhere("trade_in_request.status = :status", { status }); return query.orderBy("trade_in_request.created_at", "DESC").getMany(); }
  async find(id: string): Promise<TradeInRequest | undefined> { return this.dataSource.getRepository(TradeInRequestEntitySchema).createQueryBuilder("trade_in_request").where("trade_in_request.id = :id", { id }).andWhere("trade_in_request.status <> :draft", { draft: "draft" }).getOne().then((request) => request ?? undefined); }
  async submit(id: string, customerId: string): Promise<TradeInRequest | undefined> { const repository = this.dataSource.getRepository(TradeInRequestEntitySchema); const request = await repository.findOneBy({ id, customerId }); if (!request) return undefined; if (request.status !== "draft") throw new TradeInTransitionError("Only draft trade-in requests can be submitted"); const attachments = await this.attachmentRepository.listByTradeInRequest(id); if (!attachments.some((attachment) => attachment.mimeType.startsWith("image/"))) throw new TradeInPhotoRequiredError("At least one photo is required to submit a trade-in request"); request.status = "submitted"; const submitted = await repository.save(request); await this.submissionNotifier.execute(submitted); return submitted; }
  review(id: string): Promise<TradeInRequest | undefined> { return this.transition(id, ["submitted"], "in_review"); }
  async propose(id: string, amountCents: number, note?: string): Promise<TradeInRequest | undefined> { const request = await this.requireTransition(id, ["in_review"]); if (!request) return undefined; request.status = "proposal_sent"; request.proposedAmountCents = amountCents; request.proposalNote = note?.trim() || null; return this.dataSource.getRepository(TradeInRequestEntitySchema).save(request); }
  accept(id: string, customerId: string): Promise<TradeInRequest | undefined> { return this.transition(id, ["proposal_sent"], "accepted", customerId); }
  reject(id: string, customerId: string): Promise<TradeInRequest | undefined> { return this.transition(id, ["proposal_sent"], "rejected", customerId); }
  async complete(id: string, finalAmountCents: number, method: TradeInPayoutMethod, reference?: string): Promise<TradeInRequest | undefined> { return this.dataSource.transaction(async (manager) => { const repository = manager.getRepository(TradeInRequestEntitySchema); const request = await repository.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }); if (!request) return undefined; if (request.status !== "accepted") throw new TradeInTransitionError("Trade-in request must be accepted before completion"); request.status = "completed"; request.finalAmountCents = finalAmountCents; request.completedAt = new Date(); const saved = await repository.save(request); await manager.getRepository(TradeInPayoutEntitySchema).save({ id: randomUUID(), tradeInRequestId: id, amountCents: finalAmountCents, method, reference: reference?.trim() || null, paidAt: new Date() }); return saved; }); }
  private async transition(id: string, expected: readonly TradeInStatus[], next: TradeInStatus, customerId?: string): Promise<TradeInRequest | undefined> { const request = await this.dataSource.getRepository(TradeInRequestEntitySchema).findOneBy(customerId ? { id, customerId } : { id }); if (!request) return undefined; if (!expected.includes(request.status)) throw new TradeInTransitionError("Invalid trade-in request status transition"); request.status = next; if (next === "accepted" || next === "rejected") request.decidedAt = new Date(); return this.dataSource.getRepository(TradeInRequestEntitySchema).save(request); }
  private async requireTransition(id: string, expected: readonly TradeInStatus[]): Promise<TradeInRequest | undefined> { const request = await this.dataSource.getRepository(TradeInRequestEntitySchema).findOneBy({ id }); if (!request) return undefined; if (!expected.includes(request.status)) throw new TradeInTransitionError("Invalid trade-in request status transition"); return request; }
  getPayout(id: string): Promise<TradeInPayout | undefined> { return this.dataSource.getRepository(TradeInPayoutEntitySchema).findOneBy({ tradeInRequestId: id }).then((payout) => payout ?? undefined); }
}
