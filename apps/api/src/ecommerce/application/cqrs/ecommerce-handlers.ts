import { Service } from "@xtaskjs/core";
import { CommandHandler, QueryHandler, type ICommandHandler, type IQueryHandler } from "@xtaskjs/cqrs";
import type { Customer } from "../../../customers/domain/customer.js";
import type { EcommerceOrder, EcommerceProduct } from "../../domain/ecommerce.js";
import type { TradeInRequest } from "../../domain/trade-in-request.js";
import { EcommerceService, type EcommerceOrderPage, type EcommerceOrderView, type ProductPage } from "../ecommerce-service.js";
import { RegisterShopCustomer } from "../register-shop-customer.js";
import { ShopRegistrationVerification } from "../shop-registration-verification.js";
import { TradeInService } from "../trade-in-service.js";
import { CompleteTradeInRequestCommand, CreateEcommerceProductCommand, CreateTradeInRequestCommand, DecideTradeInRequestCommand, GetCustomerEcommerceOrderQuery, GetEcommerceProductQuery, GetOwnTradeInRequestQuery, GetPublicProductQuery, GetShopRegistrationVerificationQuery, GetTradeInRequestQuery, ListCustomerEcommerceOrdersQuery, ListEcommerceOrdersQuery, ListEcommerceProductsQuery, ListOwnTradeInRequestsQuery, ListPublicProductsQuery, ListTradeInRequestsQuery, PlaceEcommerceOrderCommand, ProposeTradeInRequestCommand, RegisterShopCustomerCommand, RequestShopRegistrationVerificationCommand, ReviewTradeInRequestCommand, SubmitTradeInRequestCommand, UpdateEcommerceOrderStatusCommand, UpdateEcommerceProductCommand } from "./ecommerce-messages.js";

@Service()
@CommandHandler(RegisterShopCustomerCommand)
export class RegisterShopCustomerHandler implements ICommandHandler<RegisterShopCustomerCommand, Customer> {
  constructor(private readonly useCase: RegisterShopCustomer) {}

  execute(command: RegisterShopCustomerCommand): Promise<Customer> {
    return this.useCase.execute(command.input, command.ipAddress, command.verificationToken);
  }
}

@Service() @CommandHandler(RequestShopRegistrationVerificationCommand)
export class RequestShopRegistrationVerificationHandler implements ICommandHandler<RequestShopRegistrationVerificationCommand, void> {
  constructor(private readonly verification: ShopRegistrationVerification) {}
  execute(command: RequestShopRegistrationVerificationCommand): Promise<void> { return this.verification.request(command.email); }
}

@Service() @QueryHandler(GetShopRegistrationVerificationQuery)
export class GetShopRegistrationVerificationHandler implements IQueryHandler<GetShopRegistrationVerificationQuery, string | undefined> {
  constructor(private readonly verification: ShopRegistrationVerification) {}
  execute(query: GetShopRegistrationVerificationQuery): Promise<string | undefined> { return this.verification.verify(query.token); }
}

@Service() @QueryHandler(ListPublicProductsQuery)
export class ListPublicProductsHandler implements IQueryHandler<ListPublicProductsQuery, ProductPage> { constructor(private readonly service: EcommerceService) {} execute(query: ListPublicProductsQuery): Promise<ProductPage> { return this.service.listPublicProducts(query.options); } }
@Service() @QueryHandler(GetPublicProductQuery)
export class GetPublicProductHandler implements IQueryHandler<GetPublicProductQuery, EcommerceProduct | undefined> { constructor(private readonly service: EcommerceService) {} execute(query: GetPublicProductQuery): Promise<EcommerceProduct | undefined> { return this.service.findPublicProduct(query.id); } }
@Service() @CommandHandler(CreateEcommerceProductCommand)
export class CreateEcommerceProductHandler implements ICommandHandler<CreateEcommerceProductCommand, EcommerceProduct> { constructor(private readonly service: EcommerceService) {} execute(command: CreateEcommerceProductCommand): Promise<EcommerceProduct> { return this.service.createProduct(command.input); } }
@Service() @CommandHandler(UpdateEcommerceProductCommand)
export class UpdateEcommerceProductHandler implements ICommandHandler<UpdateEcommerceProductCommand, EcommerceProduct | undefined> { constructor(private readonly service: EcommerceService) {} execute(command: UpdateEcommerceProductCommand): Promise<EcommerceProduct | undefined> { return this.service.updateProduct(command.id, command.input); } }
@Service() @QueryHandler(ListEcommerceProductsQuery)
export class ListEcommerceProductsHandler implements IQueryHandler<ListEcommerceProductsQuery, ProductPage> { constructor(private readonly service: EcommerceService) {} execute(query: ListEcommerceProductsQuery): Promise<ProductPage> { return this.service.listProducts(query.options); } }
@Service() @QueryHandler(GetEcommerceProductQuery)
export class GetEcommerceProductHandler implements IQueryHandler<GetEcommerceProductQuery, EcommerceProduct | undefined> { constructor(private readonly service: EcommerceService) {} execute(query: GetEcommerceProductQuery): Promise<EcommerceProduct | undefined> { return this.service.findProduct(query.id); } }
@Service() @CommandHandler(PlaceEcommerceOrderCommand)
export class PlaceEcommerceOrderHandler implements ICommandHandler<PlaceEcommerceOrderCommand, EcommerceOrderView> { constructor(private readonly service: EcommerceService) {} execute(command: PlaceEcommerceOrderCommand): Promise<EcommerceOrderView> { return this.service.placeOrder(command.customerId, command.input); } }
@Service() @QueryHandler(ListCustomerEcommerceOrdersQuery)
export class ListCustomerEcommerceOrdersHandler implements IQueryHandler<ListCustomerEcommerceOrdersQuery, readonly EcommerceOrderView[]> { constructor(private readonly service: EcommerceService) {} execute(query: ListCustomerEcommerceOrdersQuery): Promise<readonly EcommerceOrderView[]> { return this.service.listCustomerOrders(query.customerId); } }
@Service() @QueryHandler(GetCustomerEcommerceOrderQuery)
export class GetCustomerEcommerceOrderHandler implements IQueryHandler<GetCustomerEcommerceOrderQuery, EcommerceOrderView | undefined> { constructor(private readonly service: EcommerceService) {} execute(query: GetCustomerEcommerceOrderQuery): Promise<EcommerceOrderView | undefined> { return this.service.findCustomerOrder(query.id, query.customerId); } }
@Service() @QueryHandler(ListEcommerceOrdersQuery)
export class ListEcommerceOrdersHandler implements IQueryHandler<ListEcommerceOrdersQuery, EcommerceOrderPage> { constructor(private readonly service: EcommerceService) {} execute(query: ListEcommerceOrdersQuery): Promise<EcommerceOrderPage> { return this.service.listOrders(query.options); } }
@Service() @CommandHandler(UpdateEcommerceOrderStatusCommand)
export class UpdateEcommerceOrderStatusHandler implements ICommandHandler<UpdateEcommerceOrderStatusCommand, EcommerceOrder | undefined> { constructor(private readonly service: EcommerceService) {} execute(command: UpdateEcommerceOrderStatusCommand): Promise<EcommerceOrder | undefined> { return command.status === "paid" ? this.service.markOrderPaid(command.id, command.paymentReference) : this.service.changeOrderStatus(command.id, command.status, command.paymentReference); } }
@Service() @CommandHandler(CreateTradeInRequestCommand)
export class CreateTradeInRequestHandler implements ICommandHandler<CreateTradeInRequestCommand, TradeInRequest> { constructor(private readonly service: TradeInService) {} execute(command: CreateTradeInRequestCommand): Promise<TradeInRequest> { return this.service.create(command.customerId, command.input); } }
@Service() @CommandHandler(SubmitTradeInRequestCommand)
export class SubmitTradeInRequestHandler implements ICommandHandler<SubmitTradeInRequestCommand, TradeInRequest | undefined> { constructor(private readonly service: TradeInService) {} execute(command: SubmitTradeInRequestCommand): Promise<TradeInRequest | undefined> { return this.service.submit(command.id, command.customerId); } }
@Service() @QueryHandler(ListOwnTradeInRequestsQuery)
export class ListOwnTradeInRequestsHandler implements IQueryHandler<ListOwnTradeInRequestsQuery, readonly TradeInRequest[]> { constructor(private readonly service: TradeInService) {} execute(query: ListOwnTradeInRequestsQuery): Promise<readonly TradeInRequest[]> { return this.service.listOwn(query.customerId); } }
@Service() @QueryHandler(GetOwnTradeInRequestQuery)
export class GetOwnTradeInRequestHandler implements IQueryHandler<GetOwnTradeInRequestQuery, TradeInRequest | undefined> { constructor(private readonly service: TradeInService) {} execute(query: GetOwnTradeInRequestQuery): Promise<TradeInRequest | undefined> { return this.service.findOwn(query.id, query.customerId); } }
@Service() @CommandHandler(ReviewTradeInRequestCommand)
export class ReviewTradeInRequestHandler implements ICommandHandler<ReviewTradeInRequestCommand, TradeInRequest | undefined> { constructor(private readonly service: TradeInService) {} execute(command: ReviewTradeInRequestCommand): Promise<TradeInRequest | undefined> { return this.service.review(command.id); } }
@Service() @CommandHandler(ProposeTradeInRequestCommand)
export class ProposeTradeInRequestHandler implements ICommandHandler<ProposeTradeInRequestCommand, TradeInRequest | undefined> { constructor(private readonly service: TradeInService) {} execute(command: ProposeTradeInRequestCommand): Promise<TradeInRequest | undefined> { return this.service.propose(command.id, command.amountCents, command.note); } }
@Service() @CommandHandler(DecideTradeInRequestCommand)
export class DecideTradeInRequestHandler implements ICommandHandler<DecideTradeInRequestCommand, TradeInRequest | undefined> { constructor(private readonly service: TradeInService) {} execute(command: DecideTradeInRequestCommand): Promise<TradeInRequest | undefined> { return command.decision === "accepted" ? this.service.accept(command.id, command.customerId) : this.service.reject(command.id, command.customerId); } }
@Service() @CommandHandler(CompleteTradeInRequestCommand)
export class CompleteTradeInRequestHandler implements ICommandHandler<CompleteTradeInRequestCommand, TradeInRequest | undefined> { constructor(private readonly service: TradeInService) {} execute(command: CompleteTradeInRequestCommand): Promise<TradeInRequest | undefined> { return this.service.complete(command.id, command.finalAmountCents, command.method, command.reference); } }
@Service() @QueryHandler(ListTradeInRequestsQuery)
export class ListTradeInRequestsHandler implements IQueryHandler<ListTradeInRequestsQuery, readonly TradeInRequest[]> { constructor(private readonly service: TradeInService) {} execute(query: ListTradeInRequestsQuery): Promise<readonly TradeInRequest[]> { return this.service.list(query.status); } }
@Service() @QueryHandler(GetTradeInRequestQuery)
export class GetTradeInRequestHandler implements IQueryHandler<GetTradeInRequestQuery, TradeInRequest | undefined> { constructor(private readonly service: TradeInService) {} execute(query: GetTradeInRequestQuery): Promise<TradeInRequest | undefined> { return this.service.find(query.id); } }
