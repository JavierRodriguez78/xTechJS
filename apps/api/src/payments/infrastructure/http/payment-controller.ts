import { Body, Controller, Get, Param, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { CreatePaymentCommand, ListPaymentsQuery, ListRepairPaymentsQuery } from "../../application/cqrs/payment-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };
const paymentSchema = z.object({ repairOrderId: z.string().uuid(), amountCents: z.number().int().positive().max(100000000), method: z.enum(["cash", "card", "transfer"]), reference: z.string().trim().max(180).optional() });

@Authenticated()
@Controller("/api/payments")
export class PaymentController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get()
  @PermissionRequired(PERMISSIONS.paymentsManage)
  list(): Promise<unknown> { return this.queryBus.execute(new ListPaymentsQuery()); }

  @Get("/repair/:repairOrderId")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  listRepair(@Param("repairOrderId") id: string): Promise<unknown> { return this.queryBus.execute(new ListRepairPaymentsQuery(id)); }

  @Post()
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async create(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid payment", issues: parsed.error.flatten() });
    return reply.code(201).send(await this.commandBus.execute(new CreatePaymentCommand(parsed.data)));
  }
}
