import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRepairIntakeDetailsMigration implements MigrationInterface {
  name = "AddRepairIntakeDetailsMigration1739700000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "repair_orders" ADD COLUMN "estimated_completion_at" timestamptz');
    await queryRunner.query(`CREATE TABLE "repair_device_secrets" (
      "repair_order_id" uuid PRIMARY KEY REFERENCES "repair_orders"("id") ON DELETE CASCADE,
      "encrypted_passcode" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "repair_condition_records" (
      "id" uuid PRIMARY KEY,
      "repair_order_id" uuid NOT NULL REFERENCES "repair_orders"("id") ON DELETE CASCADE,
      "phase" varchar(32) NOT NULL CHECK ("phase" IN ('pre_repair', 'post_repair')),
      "checklist" jsonb NOT NULL,
      "recorded_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now()
    ); CREATE INDEX "repair_condition_records_order_phase_idx" ON "repair_condition_records" ("repair_order_id", "phase", "created_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "repair_condition_records"');
    await queryRunner.query('DROP TABLE "repair_device_secrets"');
    await queryRunner.query('ALTER TABLE "repair_orders" DROP COLUMN "estimated_completion_at"');
  }
}