import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialPurchaseOrdersMigration implements MigrationInterface {
  name = "InitialPurchaseOrdersMigration1736812800000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "purchase_orders" (
      "id" uuid PRIMARY KEY, "supplier_id" uuid NOT NULL REFERENCES "inventory_suppliers"("id"),
      "status" varchar(32) NOT NULL, "lines" jsonb NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "received_at" timestamptz
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE "purchase_orders"'); }
}
