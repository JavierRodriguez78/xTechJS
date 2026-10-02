import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Param, Patch, Post, Req, Res } from "@xtaskjs/common";
import type { FastifyRequest } from "fastify";
import { Authenticated } from "@xtaskjs/security";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { z } from "zod";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { SaveStoreInput, Store } from "../../domain/store.js";
import { StoreEntitySchema } from "../persistence/store-entity.js";

const schema = z.object({ name: z.string().trim().min(1).max(160), legalName: z.string().trim().max(200).optional(), addressStreet: z.string().trim().min(1).max(500), addressPostalCode: z.string().trim().regex(/^\d{5}$/, "El codigo postal debe tener cinco digitos"), addressCity: z.string().trim().min(1).max(120), addressProvince: z.string().trim().min(1).max(120), addressCountry: z.string().trim().min(1).max(80).default("España"), phone: z.string().trim().max(80).optional(), email: z.union([z.string().trim().email().max(320), z.literal("")]).optional(), taxId: z.string().trim().max(80).optional(), openingHours: z.string().trim().max(500).optional(), invoiceSeriesPrefix: z.string().trim().min(1).max(32), logoUrl: z.union([z.string().trim().url().max(2000), z.literal("")]).optional(), veriFactuSystemId: z.string().trim().max(120).optional(), active: z.boolean().optional() });
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
    if (!await this.validAddress(parsed.data)) return reply.code(400).send({ message: "Selecciona una direccion del catalogo postal de Espana." });
    return reply.code(201).send(await this.dataSource.getRepository(StoreEntitySchema).save({ id: randomUUID(), ...toRecord(parsed.data) }));
  }

  @Patch("/:id")
  @PermissionRequired(PERMISSIONS.storesManage)
  async update(@Param("id") id: string, @Body() body: unknown, @Res() reply: Reply): Promise<unknown> {
    const parsed = schema.partial().refine((value) => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid store", issues: parsed.error.flatten() });
    const repository = this.dataSource.getRepository(StoreEntitySchema);
    const store = await repository.findOneBy({ id });
    if (!store) return reply.code(404).send({ message: "Store not found" });
    const next = { ...store, ...toRecord(parsed.data) };
    if (Object.keys(parsed.data).some((key) => key.startsWith("address"))) {
      if (!await this.validAddress(next)) return reply.code(400).send({ message: "Selecciona una direccion del catalogo postal de Espana." });
      next.address = [next.addressStreet, `${next.addressPostalCode} ${next.addressCity}`, next.addressProvince, next.addressCountry].join(", ");
    }
    return repository.save(next);
  }

  @Get("/address-catalog/countries")
  @PermissionRequired(PERMISSIONS.storesManage)
  countries(): Promise<unknown> {
    return this.dataSource.query('SELECT code, name, code = \'ES\' AS "postalCoverage" FROM address_countries ORDER BY name');
  }

  @Get("/address-catalog/provinces")
  @PermissionRequired(PERMISSIONS.storesManage)
  provinces(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> | unknown {
    const parsed = z.object({ countryCode: z.string().regex(/^[A-Z]{2}$/) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid country code" });
    return this.dataSource.query('SELECT code, name FROM address_provinces WHERE country_code = $1 ORDER BY name', [parsed.data.countryCode]);
  }

  @Get("/address-catalog/places")
  @PermissionRequired(PERMISSIONS.storesManage)
  places(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> | unknown {
    const parsed = z.object({ provinceCode: z.string().regex(/^[A-Z0-9]{1,2}$/) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid province code" });
    return this.dataSource.query('SELECT city, postal_code AS "postalCode" FROM address_postal_places WHERE province_code = $1 ORDER BY city, postal_code', [parsed.data.provinceCode]);
  }

  private async validAddress(input: Pick<SaveStoreInput, "addressCountry" | "addressProvince" | "addressCity" | "addressPostalCode">): Promise<boolean> {
    const rows = await this.dataSource.query(`SELECT 1 FROM address_postal_places place JOIN address_provinces province ON province.code = place.province_code JOIN address_countries country ON country.code = province.country_code WHERE country.name = $1 AND province.name = $2 AND place.city = $3 AND place.postal_code = $4 LIMIT 1`, [input.addressCountry, input.addressProvince, input.addressCity, input.addressPostalCode]);
    return rows.length > 0;
  }
}

function toRecord(input: Partial<SaveStoreInput>): Partial<Store> {
  const address = input.addressStreet === undefined ? undefined : [input.addressStreet, [input.addressPostalCode, input.addressCity].filter(Boolean).join(" "), input.addressProvince, input.addressCountry].filter(Boolean).join(", ");
  return {
    ...input,
    ...(address === undefined ? {} : { address }),
    ...(input.phone === undefined ? {} : { phone: input.phone || null }),
    ...(input.email === undefined ? {} : { email: input.email || null }),
    ...(input.legalName === undefined ? {} : { legalName: input.legalName || null }),
    ...(input.taxId === undefined ? {} : { taxId: input.taxId || null }),
    ...(input.openingHours === undefined ? {} : { openingHours: input.openingHours || null }),
    ...(input.logoUrl === undefined ? {} : { logoUrl: input.logoUrl || null }),
    ...(input.veriFactuSystemId === undefined ? {} : { veriFactuSystemId: input.veriFactuSystemId || null })
  };
}