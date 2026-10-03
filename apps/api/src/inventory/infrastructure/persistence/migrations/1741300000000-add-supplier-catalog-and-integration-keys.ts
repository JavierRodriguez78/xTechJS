import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupplierCatalogAndIntegrationKeysMigration1741300000000 implements MigrationInterface {
  name = "AddSupplierCatalogAndIntegrationKeysMigration1741300000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "external_ref" varchar(320)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "website" varchar(2000)');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inventory_suppliers_external_ref" ON "inventory_suppliers" ("external_ref") WHERE "external_ref" IS NOT NULL');
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "integration_api_keys" (
      "id" uuid PRIMARY KEY,
      "name" varchar(160) NOT NULL,
      "key_hash" varchar(60) NOT NULL,
      "scope" varchar(64) NOT NULL,
      "active" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "last_used_at" timestamptz
    )`);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_integration_api_keys_active_scope" ON "integration_api_keys" ("active", "scope")');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_integration_api_keys_active_name" ON "integration_api_keys" ("name") WHERE "active" = true');
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "inventory_supplier_catalog_items" (
      "id" uuid PRIMARY KEY,
      "supplier_id" uuid NOT NULL REFERENCES "inventory_suppliers"("id") ON DELETE CASCADE,
      "external_ref" varchar(500) NOT NULL,
      "name" varchar(200) NOT NULL,
      "category" varchar(120),
      "brand" varchar(120),
      "compatible_models" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "sku" varchar(120),
      "price_cents" integer NOT NULL CHECK ("price_cents" >= 0),
      "currency" varchar(3) NOT NULL DEFAULT 'EUR',
      "availability" varchar(20) NOT NULL DEFAULT 'unknown' CHECK ("availability" IN ('in_stock', 'out_of_stock', 'unknown')),
      "url" varchar(2000) NOT NULL,
      "captured_at" timestamptz NOT NULL,
      "inventory_item_id" uuid REFERENCES "inventory_items"("id") ON DELETE SET NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_inventory_supplier_catalog_supplier_external_ref" UNIQUE ("supplier_id", "external_ref")
    )`);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_inventory_supplier_catalog_name" ON "inventory_supplier_catalog_items" ("name")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_inventory_supplier_catalog_category" ON "inventory_supplier_catalog_items" ("category")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_inventory_supplier_catalog_brand" ON "inventory_supplier_catalog_items" ("brand")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_inventory_supplier_catalog_availability" ON "inventory_supplier_catalog_items" ("availability")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_inventory_supplier_catalog_price" ON "inventory_supplier_catalog_items" ("price_cents")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_inventory_supplier_catalog_inventory_item" ON "inventory_supplier_catalog_items" ("inventory_item_id")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_inventory_supplier_catalog_compatible_models" ON "inventory_supplier_catalog_items" USING GIN ("compatible_models")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "inventory_supplier_catalog_items"');
    await queryRunner.query('DROP TABLE IF EXISTS "integration_api_keys"');
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_inventory_suppliers_external_ref"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "website"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "external_ref"');
  }
}
