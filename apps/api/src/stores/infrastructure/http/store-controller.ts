import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Param, Patch, Post, Req, Res } from "@xtaskjs/common";
import type { FastifyRequest } from "fastify";
import { Authenticated } from "@xtaskjs/security";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { z } from "zod";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { getStoreAccess } from "../../../users/domain/store-access.js";
import { GlobalPermissionRequired, PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { SaveStoreInput, Store } from "../../domain/store.js";
import { STORE_WEEK_DAYS } from "../../domain/store.js";
import { StoreEntitySchema } from "../persistence/store-entity.js";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const weeklyOpeningHoursSchema = z.array(z.discriminatedUnion("open", [
  z.object({ day: z.enum(STORE_WEEK_DAYS), open: z.literal(true), opensAt: timeSchema, closesAt: timeSchema }),
  z.object({ day: z.enum(STORE_WEEK_DAYS), open: z.literal(false), opensAt: z.null(), closesAt: z.null() })
])).length(7).superRefine((days, context) => {
  if (new Set(days.map((day) => day.day)).size !== 7) context.addIssue({ code: z.ZodIssueCode.custom, message: "El horario debe contener los siete dias sin duplicados." });
  days.forEach((day, index) => {
    if (day.open && day.closesAt <= day.opensAt) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "closesAt"], message: "El cierre debe ser posterior a la apertura." });
  });
});

const schema = z.object({ name: z.string().trim().min(1).max(160), legalName: z.string().trim().max(200).optional(), addressStreet: z.string().trim().min(1).max(500), addressPostalCode: z.string().trim().regex(/^\d{5}$/, "El codigo postal debe tener cinco digitos"), addressCity: z.string().trim().min(1).max(120), addressProvince: z.string().trim().min(1).max(120), addressCountry: z.string().trim().min(1).max(80).default("España"), phone: z.string().trim().max(80).optional(), email: z.union([z.string().trim().email().max(320), z.literal("")]).optional(), taxId: z.string().trim().max(80).optional(), openingHours: z.string().trim().max(500).optional(), weeklyOpeningHours: weeklyOpeningHoursSchema.optional(), invoiceSeriesPrefix: z.string().trim().min(1).max(32), logoUrl: z.union([z.string().trim().url().max(2000), z.literal("")]).optional(), veriFactuSystemId: z.string().trim().max(120).optional(), active: z.boolean().optional() });
type Reply = { code(status: number): Reply; send(value: unknown): unknown };

@Authenticated()
@Controller("/api/stores")
export class StoreController {
  @InjectDataSource() private readonly dataSource!: DataSource;

  @Get()
  @GlobalPermissionRequired(PERMISSIONS.storesManage)
  list(): Promise<Store[]> { return this.dataSource.getRepository(StoreEntitySchema).find({ order: { name: "ASC" } }); }

  @Get("/session-store")
  async sessionStore(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> {
    const user = request.user as { role: string; storeId?: string | null; defaultStoreId?: string | null; storeAccess?: string[] | null };
    if (user.role !== "admin" && user.role !== "technician") return reply.code(403).send({ message: "Forbidden" });
    const defaultStoreId = user.defaultStoreId ?? user.storeId ?? user.storeAccess?.[0] ?? null;
    if (!defaultStoreId) return null;
    const store = await this.dataSource.getRepository(StoreEntitySchema).findOneBy({ id: defaultStoreId });
    return store ? { id: store.id, name: store.name, active: store.active } : null;
  }

    @Get("/accessible")
    async accessibleStores(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> {
      const user = request.user as { role: string; storeId?: string | null; defaultStoreId?: string | null; storeAccess?: string[] | null };
      if (user.role !== "admin" && user.role !== "technician") return reply.code(403).send({ message: "Forbidden" });
      const access = getStoreAccess(user);
      if (access?.length === 0) return [];
      if (access === null) return this.dataSource.query('SELECT id, name, active FROM stores WHERE active = true ORDER BY name');
      return this.dataSource.query('SELECT id, name, active FROM stores WHERE active = true AND id = ANY($1::uuid[]) ORDER BY name', [access]);
    }

  @Post()
  @GlobalPermissionRequired(PERMISSIONS.storesManage)
  async create(@Body() body: unknown, @Res() reply: Reply): Promise<unknown> {
    const parsed = schema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid store", issues: parsed.error.flatten() });
    if (!await this.validAddress(parsed.data)) return reply.code(400).send({ message: "Selecciona una direccion del catalogo postal de Espana." });
    return reply.code(201).send(await this.dataSource.getRepository(StoreEntitySchema).save({ id: randomUUID(), ...toRecord(parsed.data) }));
  }

  @Patch("/:id")
  @GlobalPermissionRequired(PERMISSIONS.storesManage)
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
  @PermissionRequired(PERMISSIONS.usersManage)
  countries(): Promise<unknown> {
    return this.dataSource.query('SELECT code, name, code = \'ES\' AS "postalCoverage" FROM address_countries ORDER BY name');
  }

  @Get("/address-catalog/provinces")
  @PermissionRequired(PERMISSIONS.usersManage)
  provinces(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> | unknown {
    const parsed = z.object({ countryCode: z.string().regex(/^[A-Z]{2}$/) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid country code" });
    return this.dataSource.query('SELECT code, name FROM address_provinces WHERE country_code = $1 ORDER BY name', [parsed.data.countryCode]);
  }

  @Get("/address-catalog/places")
  @PermissionRequired(PERMISSIONS.usersManage)
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