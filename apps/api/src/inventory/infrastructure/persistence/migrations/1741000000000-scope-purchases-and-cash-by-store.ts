import type { MigrationInterface, QueryRunner } from "typeorm";

export class ScopePurchasesAndCashByStoreMigration implements MigrationInterface {
  name = "ScopePurchasesAndCashByStoreMigration1741000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_orders" ADD COLUMN "store_id" uuid;
      UPDATE "purchase_orders" SET "store_id" = (SELECT "id" FROM "stores" ORDER BY "created_at", "id" LIMIT 1);
      ALTER TABLE "purchase_orders" ALTER COLUMN "store_id" SET NOT NULL;
      ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");
      CREATE INDEX "purchase_orders_store_status_idx" ON "purchase_orders" ("store_id", "status", "created_at" DESC);

      ALTER TABLE "cash_registers" ADD COLUMN "store_id" uuid;
      UPDATE "cash_registers" SET "store_id" = (SELECT "id" FROM "stores" ORDER BY "created_at", "id" LIMIT 1);
      ALTER TABLE "cash_registers" ALTER COLUMN "store_id" SET NOT NULL;
      ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");
      ALTER TABLE "cash_registers" DROP CONSTRAINT "cash_registers_business_date_key";
      ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_business_date_store_id_key" UNIQUE ("business_date", "store_id");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "purchase_orders_store_status_idx";
      ALTER TABLE "cash_registers" DROP CONSTRAINT IF EXISTS "cash_registers_business_date_store_id_key";
      ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_business_date_key" UNIQUE ("business_date");
      ALTER TABLE "cash_registers" DROP CONSTRAINT IF EXISTS "cash_registers_store_id_fkey";
      ALTER TABLE "cash_registers" DROP COLUMN "store_id";
      ALTER TABLE "purchase_orders" DROP CONSTRAINT IF EXISTS "purchase_orders_store_id_fkey";
      ALTER TABLE "purchase_orders" DROP COLUMN "store_id";
    `);
  }
}