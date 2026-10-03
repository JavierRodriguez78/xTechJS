import type { EcommerceOrderStatus } from "../../domain/ecommerce.js";
import type { TradeInPayoutMethod, TradeInStatus } from "../../domain/trade-in-request.js";
import type { CreateProductInput, EcommerceOrderListOptions, ManagedProductListOptions, PlaceOrderInput, ProductListOptions } from "../ecommerce-service.js";
import type { RegisterShopCustomerInput } from "../register-shop-customer.js";
import type { CreateTradeInRequestInput } from "../trade-in-service.js";

export class RegisterShopCustomerCommand {
  constructor(public readonly input: RegisterShopCustomerInput, public readonly ipAddress: string | null, public readonly verificationToken: string) {}
}
export class RequestShopRegistrationVerificationCommand { constructor(public readonly email: string) {} }
export class GetShopRegistrationVerificationQuery { constructor(public readonly token: string) {} }

export class ListPublicProductsQuery { constructor(public readonly options: ProductListOptions) {} }
export class GetPublicProductQuery { constructor(public readonly id: string) {} }
export class CreateEcommerceProductCommand { constructor(public readonly input: CreateProductInput) {} }
export class UpdateEcommerceProductCommand { constructor(public readonly id: string, public readonly input: Partial<CreateProductInput>) {} }
export class ListEcommerceProductsQuery { constructor(public readonly options: ManagedProductListOptions) {} }
export class GetEcommerceProductQuery { constructor(public readonly id: string) {} }
export class PlaceEcommerceOrderCommand { constructor(public readonly customerId: string, public readonly input: PlaceOrderInput) {} }
export class ListCustomerEcommerceOrdersQuery { constructor(public readonly customerId: string) {} }
export class GetCustomerEcommerceOrderQuery { constructor(public readonly id: string, public readonly customerId: string) {} }
export class ListEcommerceOrdersQuery { constructor(public readonly options: EcommerceOrderListOptions) {} }
export class UpdateEcommerceOrderStatusCommand { constructor(public readonly id: string, public readonly status: EcommerceOrderStatus, public readonly paymentReference?: string) {} }
export class CreateTradeInRequestCommand { constructor(public readonly customerId: string, public readonly input: CreateTradeInRequestInput) {} }
export class SubmitTradeInRequestCommand { constructor(public readonly id: string, public readonly customerId: string) {} }
export class ListOwnTradeInRequestsQuery { constructor(public readonly customerId: string) {} }
export class GetOwnTradeInRequestQuery { constructor(public readonly id: string, public readonly customerId: string) {} }
export class ReviewTradeInRequestCommand { constructor(public readonly id: string) {} }
export class ProposeTradeInRequestCommand { constructor(public readonly id: string, public readonly amountCents: number, public readonly note?: string) {} }
export class DecideTradeInRequestCommand { constructor(public readonly id: string, public readonly customerId: string, public readonly decision: "accepted" | "rejected") {} }
export class CompleteTradeInRequestCommand { constructor(public readonly id: string, public readonly finalAmountCents: number, public readonly method: TradeInPayoutMethod, public readonly reference?: string) {} }
export class ListTradeInRequestsQuery { constructor(public readonly status?: TradeInStatus) {} }
export class GetTradeInRequestQuery { constructor(public readonly id: string) {} }
