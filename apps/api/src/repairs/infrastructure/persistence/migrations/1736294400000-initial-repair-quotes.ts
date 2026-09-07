import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialRepairQuotesMigration implements MigrationInterface {
  name = "InitialRepairQuotesMigration1736294400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "repair_quotes" (
      "id" uuid PRIMARY KEY, "repair_order_id" uuid NOT NULL UNIQUE REFERENCES "repair_orders"("id") ON DELETE CASCADE,
      "lines" jsonb NOT NULL, "total_cents" integer NOT NULL CHECK ("total_cents" >= 0), "status" varchar(32) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "repair_quotes"');
  }
}