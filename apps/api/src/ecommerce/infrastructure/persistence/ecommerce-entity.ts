import { EntitySchema } from "typeorm";
import type { EcommerceOrder, EcommerceOrderLine, EcommerceProduct } from "../../domain/ecommerce.js";

export const EcommerceProductEntitySchema = new EntitySchema<EcommerceProduct>({
  name: "EcommerceProduct",
  tableName: "ecommerce_products",
  columns: {
    id: { type: "uuid", primary: true }, sku: { type: String, unique: true }, title: { type: String }, description: { type: "text" },
    category: { type: String }, condition: { type: String }, priceCents: { type: Number, name: "price_cents" }, currency: { type: String, default: "EUR" }, stockQuantity: { type: Number, name: "stock_quantity" }, published: { type: Boolean, default: false },
    sourceInventoryItemId: { type: "uuid", name: "source_inventory_item_id", nullable: true }, sourceTradeInRequestId: { type: "uuid", name: "source_trade_in_request_id", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }, updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});

export const EcommerceOrderEntitySchema = new EntitySchema<EcommerceOrder>({
  name: "EcommerceOrder",
  tableName: "ecommerce_orders",
  columns: {
    id: { type: "uuid", primary: true }, customerId: { type: "uuid", name: "customer_id" }, totalCents: { type: Number, name: "total_cents" }, status: { type: String, default: "pending_payment" },
    shippingAddress: { type: "jsonb", name: "shipping_address" }, paymentProvider: { type: String, name: "payment_provider", default: "manual" }, paymentReference: { type: String, name: "payment_reference", nullable: true }, invoiceSeries: { type: String, name: "invoice_series", nullable: true }, invoiceNumber: { type: Number, name: "invoice_number", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }, updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});

export const EcommerceOrderLineEntitySchema = new EntitySchema<EcommerceOrderLine>({
  name: "EcommerceOrderLine",
  tableName: "ecommerce_order_lines",
  columns: { id: { type: "uuid", primary: true }, orderId: { type: "uuid", name: "order_id" }, productId: { type: "uuid", name: "product_id" }, titleSnapshot: { type: String, name: "title_snapshot" }, quantity: { type: Number }, unitPriceCentsSnapshot: { type: Number, name: "unit_price_cents_snapshot" } }
});
