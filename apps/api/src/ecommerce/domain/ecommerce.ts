export type EcommerceCategory = "console" | "retro_console" | "game" | "phone" | "tablet" | "accessory" | "other";
export type EcommerceCondition = "new" | "refurbished" | "used_good" | "used_fair";
export type EcommerceOrderStatus = "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface EcommerceProduct {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: EcommerceCategory;
  condition: EcommerceCondition;
  priceCents: number;
  currency: "EUR";
  stockQuantity: number;
  published: boolean;
  sourceInventoryItemId: string | null;
  sourceTradeInRequestId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingAddress {
  street: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
}

export interface EcommerceOrder {
  id: string;
  customerId: string;
  totalCents: number;
  status: EcommerceOrderStatus;
  shippingAddress: ShippingAddress;
  paymentProvider: "manual";
  paymentReference: string | null;
  invoiceSeries: string | null;
  invoiceNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EcommerceOrderLine {
  id: string;
  orderId: string;
  productId: string;
  titleSnapshot: string;
  quantity: number;
  unitPriceCentsSnapshot: number;
}
