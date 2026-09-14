import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceEmailsMigration implements MigrationInterface {
  name = "AddInvoiceEmailsMigration1737800000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_lines" jsonb NOT NULL DEFAULT \'[]\'::jsonb');
    await queryRunner.query(`CREATE TABLE "invoice_emails" (
      "id" uuid PRIMARY KEY,
      "payment_id" uuid NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
      "recipient" varchar(320) NOT NULL,
      "status" varchar(32) NOT NULL,
      "error_message" text,
      "sent_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE INDEX "IDX_invoice_emails_payment" ON "invoice_emails" ("payment_id", "sent_at")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "invoice_emails"');
    await queryRunner.query('ALTER TABLE "payments" DROP COLUMN IF EXISTS "invoice_lines"');
  }
}