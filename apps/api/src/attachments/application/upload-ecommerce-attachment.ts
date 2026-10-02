import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { Readable } from "node:stream";
import { Qualifier, Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { isAllowedAttachmentMimeType, type AttachmentUploaderRole, type RepairAttachment } from "../domain/repair-attachment.js";
import type { AttachmentStorage } from "./attachment-storage.js";
import type { RepairAttachmentRepository } from "./repair-attachment-repository.js";
import { EcommerceProductEntitySchema } from "../../ecommerce/infrastructure/persistence/ecommerce-entity.js";
import { TradeInRequestEntitySchema } from "../../ecommerce/infrastructure/persistence/trade-in-entity.js";

export type EcommerceAttachmentOwner = "product" | "trade_in_request";

export interface UploadEcommerceAttachmentInput {
  owner: EcommerceAttachmentOwner;
  ownerId: string;
  uploaderId: string;
  uploaderRole: AttachmentUploaderRole;
  fileName: string;
  mimeType: string;
  stream: Readable;
}

@Traceable("UploadEcommerceAttachment")
@Service()
export class UploadEcommerceAttachment {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  constructor(
    @Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository,
    @Qualifier("attachmentStorage") private readonly storage: AttachmentStorage
  ) {}

  async execute(input: UploadEcommerceAttachmentInput): Promise<RepairAttachment | undefined> {
    if (!isAllowedAttachmentMimeType(input.mimeType)) throw new Error("Unsupported file type");
    const exists = input.owner === "product"
      ? await this.dataSource.getRepository(EcommerceProductEntitySchema).existsBy({ id: input.ownerId })
      : await this.dataSource.getRepository(TradeInRequestEntitySchema).existsBy({ id: input.ownerId });
    if (!exists) return undefined;

    const storageKey = `ecommerce/${input.owner}/${input.ownerId}/${randomUUID()}${extname(input.fileName).toLowerCase()}`;
    const sizeBytes = await this.storage.save(storageKey, input.stream);
    return this.attachmentRepository.create({
      id: randomUUID(),
      repairOrderId: null,
      repairStepId: null,
      ecommerceProductId: input.owner === "product" ? input.ownerId : null,
      tradeInRequestId: input.owner === "trade_in_request" ? input.ownerId : null,
      uploaderId: input.uploaderId,
      uploaderRole: input.uploaderRole,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes,
      storageKey
    });
  }
}
