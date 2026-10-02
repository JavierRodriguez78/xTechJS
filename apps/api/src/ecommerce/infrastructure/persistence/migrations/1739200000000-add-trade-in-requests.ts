import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTradeInRequestsMigration implements MigrationInterface {
  name = "AddTradeInRequestsMigration1739200000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "trade_in_requests" (
      "id" uuid PRIMARY KEY, "customer_id" uuid NOT NULL REFERENCES "customers"("id"), "device_type" varchar(32) NOT NULL, "brand" varchar(100) NOT NULL, "model" varchar(160) NOT NULL, "condition_description" text NOT NULL, "status" varchar(32) NOT NULL DEFAULT 'submitted', "proposed_amount_cents" integer NULL CHECK ("proposed_amount_cents" >= 0), "proposal_note" text NULL, "final_amount_cents" integer NULL CHECK ("final_amount_cents" >= 0), "decided_at" timestamptz NULL, "completed_at" timestamptz NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE INDEX "trade_in_requests_customer_idx" ON "trade_in_requests" ("customer_id", "created_at" DESC)');
    await queryRunner.query('CREATE INDEX "trade_in_requests_status_idx" ON "trade_in_requests" ("status", "created_at" DESC)');
    await queryRunner.query(`CREATE TABLE "trade_in_payouts" (
      "id" uuid PRIMARY KEY, "trade_in_request_id" uuid NOT NULL UNIQUE REFERENCES "trade_in_requests"("id"), "amount_cents" integer NOT NULL CHECK ("amount_cents" >= 0), "method" varchar(32) NOT NULL, "reference" varchar(180) NULL, "paid_at" timestamptz NOT NULL
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE "trade_in_payouts"'); await queryRunner.query('DROP TABLE "trade_in_requests"'); }
}
