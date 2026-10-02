import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { EcommerceCategory, EcommerceCondition, EcommerceOrder, EcommerceOrderLine, EcommerceOrderStatus, EcommerceProduct, ShippingAddress } from "../domain/ecommerce.js";
import { EcommerceOrderEntitySchema, EcommerceOrderLineEntitySchema, EcommerceProductEntitySchema } from "../infrastructure/persistence/ecommerce-entity.js";

export interface ProductPage { items: readonly EcommerceProduct[]; total: number; page: number; pageSize: number; }
export interface ProductListOptions { query?: string; category?: EcommerceCategory; condition?: EcommerceCondition; maxPriceCents?: number; page: number; pageSize: number; }
export interface ManagedProductListOptions { query?: string; category?: EcommerceCategory; published?: boolean; page: number; pageSize: number; }
export interface EcommerceOrderPage { items: readonly EcommerceOrderView[]; total: number; page: number; pageSize: number; }
export interface EcommerceOrderListOptions { status?: EcommerceOrderStatus; page: number; pageSize: number; }
export interface CreateProductInput { sku: string; title: string; description: string; category: EcommerceCategory; condition: EcommerceCondition; priceCents: number; stockQuantity: number; published?: boolean; }
export interface PlaceOrderInput { lines: readonly { productId: string; quantity: number }[]; shippingAddress: ShippingAddress; }
export interface EcommerceOrderView extends EcommerceOrder { lines: readonly EcommerceOrderLine[]; }
export class ProductStockUnavailableError extends Error {}
export class EcommerceOrderTransitionError extends Error {}

@Traceable("EcommerceService")
@Service()
export class EcommerceService {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async listPublicProducts(options: ProductListOptions): Promise<ProductPage> {
    const query = this.dataSource.getRepository(EcommerceProductEntitySchema).createQueryBuilder("product").where("product.published = true AND product.stock_quantity > 0");
    if (options.query) query.andWhere("(product.title ILIKE :query OR product.sku ILIKE :query)", { query: `%${options.query}%` });
    if (options.category) query.andWhere("product.category = :category", { category: options.category });
    if (options.condition) query.andWhere("product.condition = :condition", { condition: options.condition });
    if (options.maxPriceCents !== undefined) query.andWhere("product.price_cents <= :maxPriceCents", { maxPriceCents: options.maxPriceCents });
    const [items, total] = await query.orderBy("product.created_at", "DESC").skip((options.page - 1) * options.pageSize).take(options.pageSize).getManyAndCount();
    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  findPublicProduct(id: string): Promise<EcommerceProduct | undefined> {
    return this.dataSource.getRepository(EcommerceProductEntitySchema).findOneBy({ id, published: true }).then((product) => product && product.stockQuantity > 0 ? product : undefined);
  }

  async listProducts(options: ManagedProductListOptions): Promise<ProductPage> {
    const query = this.dataSource.getRepository(EcommerceProductEntitySchema).createQueryBuilder("product");
    if (options.query) query.where("(product.title ILIKE :query OR product.sku ILIKE :query)", { query: `%${options.query}%` });
    if (options.category) query.andWhere("product.category = :category", { category: options.category });
    if (options.published !== undefined) query.andWhere("product.published = :published", { published: options.published });
    const [items, total] = await query.orderBy("product.created_at", "DESC").skip((options.page - 1) * options.pageSize).take(options.pageSize).getManyAndCount();
    return { items, total, page: options.page, pageSize: options.pageSize };
  }
  findProduct(id: string): Promise<EcommerceProduct | undefined> { return this.dataSource.getRepository(EcommerceProductEntitySchema).findOneBy({ id }).then((product) => product ?? undefined); }
  createProduct(input: CreateProductInput): Promise<EcommerceProduct> { return this.dataSource.getRepository(EcommerceProductEntitySchema).save({ id: randomUUID(), ...input, sku: input.sku.trim().toUpperCase(), title: input.title.trim(), description: input.description.trim(), published: input.published ?? false, currency: "EUR", sourceInventoryItemId: null, sourceTradeInRequestId: null }); }

  async updateProduct(id: string, input: Partial<CreateProductInput>): Promise<EcommerceProduct | undefined> {
    const repository = this.dataSource.getRepository(EcommerceProductEntitySchema);
    const product = await repository.preload({ id, ...input, sku: input.sku?.trim().toUpperCase(), title: input.title?.trim(), description: input.description?.trim() });
    return product ? repository.save(product) : undefined;
  }

  async placeOrder(customerId: string, input: PlaceOrderInput): Promise<EcommerceOrderView> {
    const quantities = new Map<string, number>();
    for (const line of input.lines) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(EcommerceProductEntitySchema);
      const snapshots: EcommerceOrderLine[] = [];
      let totalCents = 0;
      for (const [productId, quantity] of quantities) {
        const product = await productRepository.findOne({ where: { id: productId }, lock: { mode: "pessimistic_write" } });
        if (!product || !product.published || product.stockQuantity < quantity) throw new ProductStockUnavailableError("A requested product is unavailable");
        product.stockQuantity -= quantity;
        await productRepository.save(product);
        totalCents += product.priceCents * quantity;
        snapshots.push({ id: randomUUID(), orderId: "", productId, titleSnapshot: product.title, quantity, unitPriceCentsSnapshot: product.priceCents });
      }
      const order = await manager.getRepository(EcommerceOrderEntitySchema).save({ id: randomUUID(), customerId, totalCents, status: "pending_payment", shippingAddress: input.shippingAddress, paymentProvider: "manual", paymentReference: null, invoiceSeries: null, invoiceNumber: null });
      const lines = snapshots.map((line) => ({ ...line, orderId: order.id }));
      await manager.getRepository(EcommerceOrderLineEntitySchema).save(lines);
      return { ...order, lines };
    });
  }

  async listCustomerOrders(customerId: string): Promise<readonly EcommerceOrderView[]> {
    const orders = await this.dataSource.getRepository(EcommerceOrderEntitySchema).find({ where: { customerId }, order: { createdAt: "DESC" } });
    return Promise.all(orders.map((order) => this.withLines(order)));
  }

  async findCustomerOrder(id: string, customerId: string): Promise<EcommerceOrderView | undefined> {
    const order = await this.dataSource.getRepository(EcommerceOrderEntitySchema).findOneBy({ id, customerId });
    return order ? this.withLines(order) : undefined;
  }

  async listOrders(options: EcommerceOrderListOptions): Promise<EcommerceOrderPage> {
    const query = this.dataSource.getRepository(EcommerceOrderEntitySchema).createQueryBuilder("order");
    if (options.status) query.where("order.status = :status", { status: options.status });
    const [orders, total] = await query.orderBy("order.created_at", "DESC").skip((options.page - 1) * options.pageSize).take(options.pageSize).getManyAndCount();
    return { items: await Promise.all(orders.map((order) => this.withLines(order))), total, page: options.page, pageSize: options.pageSize };
  }

  async markOrderPaid(id: string, reference?: string): Promise<EcommerceOrder | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(EcommerceOrderEntitySchema);
      const order = await repository.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!order) return undefined;
      if (order.status !== "pending_payment") throw new EcommerceOrderTransitionError("Invalid ecommerce order status transition");
      const invoiceSeries = "E";
      const [{ number }] = await manager.query("SELECT nextval('ecommerce_invoice_number_seq') AS number") as { number: string }[];
      order.status = "paid";
      order.paymentReference = reference ?? order.paymentReference;
      order.invoiceSeries = invoiceSeries;
      order.invoiceNumber = Number(number);
      return repository.save(order);
    });
  }
  async changeOrderStatus(id: string, status: EcommerceOrderStatus, reference?: string): Promise<EcommerceOrder | undefined> {
    const repository = this.dataSource.getRepository(EcommerceOrderEntitySchema);
    const order = await repository.findOneBy({ id });
    if (!order) return undefined;
    const transitions: Partial<Record<EcommerceOrderStatus, readonly EcommerceOrderStatus[]>> = { pending_payment: ["paid", "cancelled"], paid: ["preparing", "refunded"], preparing: ["shipped", "cancelled"], shipped: ["delivered", "refunded"] };
    if (!transitions[order.status]?.includes(status)) throw new EcommerceOrderTransitionError("Invalid ecommerce order status transition");
    order.status = status;
    if (reference) order.paymentReference = reference;
    return repository.save(order);
  }

  private async withLines(order: EcommerceOrder): Promise<EcommerceOrderView> { return { ...order, lines: await this.dataSource.getRepository(EcommerceOrderLineEntitySchema).find({ where: { orderId: order.id } }) }; }
}
