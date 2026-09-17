import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceDraftsAndMaterialPricesMigration implements MigrationInterface {
  name = "AddInvoiceDraftsAndMaterialPricesMigration1738400000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "inventory_items" ADD COLUMN "sale_price_cents" integer NOT NULL DEFAULT 0 CHECK ("sale_price_cents" >= 0)');
    await queryRunner.query('ALTER TABLE "inventory_items" ADD COLUMN "tax_rate" numeric(5,2) NOT NULL DEFAULT 21 CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100)');
    await queryRunner.query(`CREATE TABLE "invoice_drafts" (
      "id" uuid PRIMARY KEY,
      "repair_order_id" uuid NOT NULL UNIQUE REFERENCES "repair_orders"("id") ON DELETE CASCADE,
      "lines" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "status" varchar(16) NOT NULL DEFAULT 'draft',
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "invoice_drafts"');
    await queryRunner.query('ALTER TABLE "inventory_items" DROP COLUMN "tax_rate"');
    await queryRunner.query('ALTER TABLE "inventory_items" DROP COLUMN "sale_price_cents"');
  }
}
