import type { MigrationInterface, QueryRunner } from "typeorm";
export class AddStockTransfersMigration implements MigrationInterface {
  name = "AddStockTransfersMigration1740300000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "stock_transfer_orders" ("id" uuid PRIMARY KEY, "origin_store_id" uuid NOT NULL REFERENCES "stores"("id"), "destination_store_id" uuid NOT NULL REFERENCES "stores"("id"), "status" varchar(16) NOT NULL DEFAULT 'draft', "note" text, "created_by_user_id" uuid NOT NULL REFERENCES "users"("id"), "created_at" timestamptz NOT NULL DEFAULT now(), "completed_at" timestamptz, CHECK ("origin_store_id" <> "destination_store_id"), CHECK ("status" IN ('draft', 'completed', 'cancelled')))`);
    await queryRunner.query(`CREATE TABLE "stock_transfer_lines" ("transfer_id" uuid NOT NULL REFERENCES "stock_transfer_orders"("id") ON DELETE CASCADE, "inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id"), "quantity" integer NOT NULL CHECK ("quantity" > 0), PRIMARY KEY ("transfer_id", "inventory_item_id"))`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE "stock_transfer_lines"'); await queryRunner.query('DROP TABLE "stock_transfer_orders"'); }
}