import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceLinesMigration implements MigrationInterface {
  name = "AddInvoiceLinesMigration1737900000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_lines" jsonb NOT NULL DEFAULT \'[]\'::jsonb');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "payments" DROP COLUMN IF EXISTS "invoice_lines"');
  }
}