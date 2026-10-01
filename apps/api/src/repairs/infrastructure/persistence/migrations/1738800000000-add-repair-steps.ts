import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRepairStepsMigration implements MigrationInterface {
  name = "AddRepairStepsMigration1738800000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "repair_steps" (
      "id" uuid PRIMARY KEY,
      "repair_order_id" uuid NOT NULL REFERENCES "repair_orders"("id") ON DELETE CASCADE,
      "sequence" integer NOT NULL,
      "title" varchar(200) NOT NULL,
      "description" text,
      "technician_id" uuid NOT NULL REFERENCES "users"("id"),
      "performed_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("repair_order_id", "sequence")
    )`);
    await queryRunner.query('CREATE INDEX "repair_steps_repair_order_id_idx" ON "repair_steps" ("repair_order_id", "sequence")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "repair_steps"');
  }
}