import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { CashRegister } from "../../domain/cash-register.js";
import { CloseCashRegister } from "../close-cash-register.js";
import { GetCashRegister } from "../get-cash-register.js";
import { OpenCashRegister } from "../open-cash-register.js";
import { CloseCashRegisterCommand, GetCashRegisterQuery, OpenCashRegisterCommand } from "./cash-register-messages.js";

@Service()
@CommandHandler(OpenCashRegisterCommand)
export class OpenCashRegisterHandler implements ICommandHandler<OpenCashRegisterCommand, CashRegister> { constructor(private readonly useCase: OpenCashRegister) {} execute(command: OpenCashRegisterCommand): Promise<CashRegister> { return this.useCase.execute(command.businessDate); } }
@Service()
@QueryHandler(GetCashRegisterQuery)
export class GetCashRegisterHandler implements IQueryHandler<GetCashRegisterQuery, CashRegister | undefined> { constructor(private readonly useCase: GetCashRegister) {} execute(query: GetCashRegisterQuery): Promise<CashRegister | undefined> { return this.useCase.execute(query.businessDate); } }
@Service()
@CommandHandler(CloseCashRegisterCommand)
export class CloseCashRegisterHandler implements ICommandHandler<CloseCashRegisterCommand, CashRegister | undefined> { constructor(private readonly useCase: CloseCashRegister) {} execute(command: CloseCashRegisterCommand): Promise<CashRegister | undefined> { return this.useCase.execute(command.businessDate); } }
