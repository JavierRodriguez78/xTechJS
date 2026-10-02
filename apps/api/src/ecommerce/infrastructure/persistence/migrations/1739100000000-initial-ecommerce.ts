import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialEcommerceMigration implements MigrationInterface {
  name = "InitialEcommerceMigration1739100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "ecommerce_products" (
      "id" uuid PRIMARY KEY, "sku" varchar(120) NOT NULL UNIQUE, "title" varchar(240) NOT NULL, "description" text NOT NULL,
      "category" varchar(32) NOT NULL, "condition" varchar(32) NOT NULL, "price_cents" integer NOT NULL CHECK ("price_cents" >= 0),
      "currency" varchar(3) NOT NULL DEFAULT 'EUR', "stock_quantity" integer NOT NULL CHECK ("stock_quantity" >= 0), "published" boolean NOT NULL DEFAULT false,
      "source_inventory_item_id" uuid NULL, "source_trade_in_request_id" uuid NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE INDEX "ecommerce_products_public_idx" ON "ecommerce_products" ("published", "stock_quantity", "created_at")');
    await queryRunner.query(`CREATE TABLE "ecommerce_orders" (
      "id" uuid PRIMARY KEY, "customer_id" uuid NOT NULL REFERENCES "customers"("id"), "total_cents" integer NOT NULL CHECK ("total_cents" >= 0),
      "status" varchar(32) NOT NULL DEFAULT 'pending_payment', "shipping_address" jsonb NOT NULL, "payment_provider" varchar(32) NOT NULL DEFAULT 'manual', "payment_reference" varchar(180) NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "ecommerce_order_lines" (
      "id" uuid PRIMARY KEY, "order_id" uuid NOT NULL REFERENCES "ecommerce_orders"("id") ON DELETE CASCADE, "product_id" uuid NOT NULL REFERENCES "ecommerce_products"("id"),
      "title_snapshot" varchar(240) NOT NULL, "quantity" integer NOT NULL CHECK ("quantity" > 0), "unit_price_cents_snapshot" integer NOT NULL CHECK ("unit_price_cents_snapshot" >= 0)
    )`);
    await queryRunner.query('CREATE INDEX "ecommerce_orders_customer_idx" ON "ecommerce_orders" ("customer_id", "created_at" DESC)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "ecommerce_order_lines"');
    await queryRunner.query('DROP TABLE "ecommerce_orders"');
    await queryRunner.query('DROP TABLE "ecommerce_products"');
  }
}
