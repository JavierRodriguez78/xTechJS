import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialPaymentsMigration implements MigrationInterface {
  name = "InitialPaymentsMigration1736899200000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "payments" (
      "id" uuid PRIMARY KEY, "repair_order_id" uuid NOT NULL REFERENCES "repair_orders"("id"),
      "amount_cents" integer NOT NULL CHECK ("amount_cents" > 0), "method" varchar(32) NOT NULL,
      "status" varchar(32) NOT NULL DEFAULT 'paid', "reference" varchar(180), "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE "payments"'); }
}
