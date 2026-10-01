import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRepairStepToAttachmentsMigration implements MigrationInterface {
  name = "AddRepairStepToAttachmentsMigration1738900000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "repair_attachments" ADD COLUMN "repair_step_id" uuid REFERENCES "repair_steps"("id") ON DELETE CASCADE');
    await queryRunner.query('CREATE INDEX "repair_attachments_repair_step_id_idx" ON "repair_attachments" ("repair_step_id")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "repair_attachments_repair_step_id_idx"');
    await queryRunner.query('ALTER TABLE "repair_attachments" DROP COLUMN "repair_step_id"');
  }
}