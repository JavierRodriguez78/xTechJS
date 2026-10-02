import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddEcommerceInvoiceSequenceMigration implements MigrationInterface {
  name = "AddEcommerceInvoiceSequenceMigration1739600000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SEQUENCE IF NOT EXISTS "ecommerce_invoice_number_seq"');
    await queryRunner.query('SELECT setval(\'ecommerce_invoice_number_seq\', COALESCE((SELECT MAX("invoice_number") FROM "ecommerce_orders"), 0) + 1, false)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP SEQUENCE IF EXISTS "ecommerce_invoice_number_seq"');
  }
}
