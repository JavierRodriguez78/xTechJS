import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialRepairOrdersMigration implements MigrationInterface {
  name = "InitialRepairOrdersMigration1736121600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "repair_orders" (
      "id" uuid PRIMARY KEY, "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
      "device_type" varchar(100) NOT NULL, "brand" varchar(100) NOT NULL, "model" varchar(160) NOT NULL,
      "serial_number" varchar(160), "reported_issue" text NOT NULL, "delivered_accessories" text,
      "status" varchar(64) NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    ); CREATE INDEX "repair_orders_customer_id_idx" ON "repair_orders" ("customer_id");
    CREATE TABLE "repair_status_events" (
      "id" uuid PRIMARY KEY, "repair_order_id" uuid NOT NULL REFERENCES "repair_orders"("id") ON DELETE CASCADE,
      "status" varchar(64) NOT NULL, "note" text, "created_at" timestamptz NOT NULL DEFAULT now()
    ); CREATE INDEX "repair_status_events_order_id_idx" ON "repair_status_events" ("repair_order_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "repair_status_events"');
    await queryRunner.query('DROP TABLE "repair_orders"');
  }
}