import type { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandSupplierProfileMigration1741400000000 implements MigrationInterface {
  name = "ExpandSupplierProfileMigration1741400000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "secondary_phone" varchar(64)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "legal_name" varchar(200)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "tax_id" varchar(80)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "address_street" varchar(500)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "address_postal_code" varchar(20)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "address_city" varchar(120)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "address_province" varchar(120)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "address_country" varchar(120)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "payment_term_days" integer');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "category" varchar(120)');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "active" boolean NOT NULL DEFAULT true');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "deactivated_at" timestamptz');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP CONSTRAINT IF EXISTS "CHK_inventory_suppliers_payment_term_days"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" ADD CONSTRAINT "CHK_inventory_suppliers_payment_term_days" CHECK ("payment_term_days" IS NULL OR "payment_term_days" BETWEEN 0 AND 60)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_inventory_suppliers_category_active" ON "inventory_suppliers" ("category", "active")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_inventory_suppliers_category_active"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP CONSTRAINT IF EXISTS "CHK_inventory_suppliers_payment_term_days"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "deactivated_at"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "active"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "category"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "payment_term_days"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "address_country"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "address_province"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "address_city"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "address_postal_code"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "address_street"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "tax_id"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "legal_name"');
    await queryRunner.query('ALTER TABLE "inventory_suppliers" DROP COLUMN IF EXISTS "secondary_phone"');
  }
}
