import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRepairStoreMigration implements MigrationInterface {
  name = "AddRepairStoreMigration1740000000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO "stores" ("id", "name", "address", "invoice_series_prefix") SELECT '00000000-0000-4000-8000-000000000001', 'Tienda principal', 'Sin direccion configurada', 'GEN-' WHERE NOT EXISTS (SELECT 1 FROM "stores")`);
    await queryRunner.query('ALTER TABLE "repair_orders" ADD "store_id" uuid');
    await queryRunner.query(`UPDATE "repair_orders" SET "store_id" = (SELECT "id" FROM "stores" ORDER BY "created_at" ASC LIMIT 1) WHERE "store_id" IS NULL`);
    await queryRunner.query('ALTER TABLE "repair_orders" ALTER COLUMN "store_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id")');
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE "repair_orders" DROP CONSTRAINT "repair_orders_store_id_fkey"'); await queryRunner.query('ALTER TABLE "repair_orders" DROP COLUMN "store_id"'); }
}