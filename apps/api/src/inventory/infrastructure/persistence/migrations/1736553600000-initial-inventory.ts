import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialInventoryMigration implements MigrationInterface {
  name = "InitialInventoryMigration1736553600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "inventory_items" (
      "id" uuid PRIMARY KEY, "sku" varchar(80) NOT NULL UNIQUE, "name" varchar(180) NOT NULL,
      "description" text, "unit" varchar(32) NOT NULL DEFAULT 'unidad', "stock" integer NOT NULL DEFAULT 0 CHECK ("stock" >= 0),
      "minimum_stock" integer NOT NULL DEFAULT 0 CHECK ("minimum_stock" >= 0), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "inventory_movements" (
      "id" uuid PRIMARY KEY, "inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id") ON DELETE CASCADE,
      "quantity" integer NOT NULL CHECK ("quantity" <> 0), "type" varchar(32) NOT NULL, "note" text, "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "inventory_movements"');
    await queryRunner.query('DROP TABLE "inventory_items"');
  }
}
