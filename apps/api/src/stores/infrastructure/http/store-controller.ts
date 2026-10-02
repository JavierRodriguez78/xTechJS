import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Param, Patch, Post, Res } from "@xtaskjs/common";
import { Authenticated } from "@xtaskjs/security";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { z } from "zod";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { SaveStoreInput, Store } from "../../domain/store.js";
import { StoreEntitySchema } from "../persistence/store-entity.js";

const schema = z.object({ name: z.string().trim().min(1).max(160), address: z.string().trim().min(1).max(500), phone: z.string().trim().max(80).optional(), taxId: z.string().trim().max(80).optional(), invoiceSeriesPrefix: z.string().trim().min(1).max(32), active: z.boolean().optional() });
type Reply = { code(status: number): Reply; send(value: unknown): unknown };

@Authenticated()
@Controller("/api/stores")
export class StoreController {
  @InjectDataSource() private readonly dataSource!: DataSource;

  @Get()
  @PermissionRequired(PERMISSIONS.storesManage)
  list(): Promise<Store[]> { return this.dataSource.getRepository(StoreEntitySchema).find({ order: { name: "ASC" } }); }

  @Post()
  @PermissionRequired(PERMISSIONS.storesManage)
  async create(@Body() body: unknown, @Res() reply: Reply): Promise<unknown> {
    const parsed = schema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid store", issues: parsed.error.flatten() });
    return reply.code(201).send(await this.dataSource.getRepository(StoreEntitySchema).save({ id: randomUUID(), ...toRecord(parsed.data) }));
  }

  @Patch("/:id")
  @PermissionRequired(PERMISSIONS.storesManage)
  async update(@Param("id") id: string, @Body() body: unknown, @Res() reply: Reply): Promise<unknown> {
    const parsed = schema.partial().refine((value) => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid store", issues: parsed.error.flatten() });
    const repository = this.dataSource.getRepository(StoreEntitySchema);
    const store = await repository.findOneBy({ id });
    return store ? repository.save({ ...store, ...toRecord(parsed.data) }) : reply.code(404).send({ message: "Store not found" });
  }
}

function toRecord(input: Partial<SaveStoreInput>): Partial<Store> { return { ...input, phone: input.phone || null, taxId: input.taxId || null }; }