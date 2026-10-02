import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddStoreInventoryStockMigration implements MigrationInterface {
  name = "AddStoreInventoryStockMigration1740100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "store_inventory_stock" (
      "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
      "inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id") ON DELETE CASCADE,
      "stock" integer NOT NULL DEFAULT 0 CHECK ("stock" >= 0),
      "minimum_stock" integer NOT NULL DEFAULT 0 CHECK ("minimum_stock" >= 0),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("store_id", "inventory_item_id")
    )`);
    await queryRunner.query(`INSERT INTO "store_inventory_stock" ("store_id", "inventory_item_id", "stock", "minimum_stock")
      SELECT (SELECT "id" FROM "stores" ORDER BY "created_at" ASC LIMIT 1), "id", "stock", "minimum_stock" FROM "inventory_items"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "store_inventory_stock"');
  }
}