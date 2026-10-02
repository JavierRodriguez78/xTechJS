import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddGenericAttachmentOwnersMigration implements MigrationInterface {
  name = "AddGenericAttachmentOwnersMigration1739300000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "repair_attachments" ADD COLUMN "ecommerce_product_id" uuid REFERENCES "ecommerce_products"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "repair_attachments" ADD COLUMN "trade_in_request_id" uuid REFERENCES "trade_in_requests"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "repair_attachments" ALTER COLUMN "repair_order_id" DROP NOT NULL');
    await queryRunner.query('UPDATE "repair_attachments" SET "repair_order_id" = NULL WHERE "repair_step_id" IS NOT NULL');
    await queryRunner.query(`ALTER TABLE "repair_attachments" ADD CONSTRAINT "repair_attachments_single_owner_check" CHECK (
      num_nonnulls("repair_order_id", "repair_step_id", "ecommerce_product_id", "trade_in_request_id") = 1
    )`);
    await queryRunner.query('CREATE INDEX "repair_attachments_ecommerce_product_id_idx" ON "repair_attachments" ("ecommerce_product_id", "created_at")');
    await queryRunner.query('CREATE INDEX "repair_attachments_trade_in_request_id_idx" ON "repair_attachments" ("trade_in_request_id", "created_at")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "repair_attachments" DROP CONSTRAINT "repair_attachments_single_owner_check"');
    await queryRunner.query('DROP INDEX "repair_attachments_trade_in_request_id_idx"');
    await queryRunner.query('DROP INDEX "repair_attachments_ecommerce_product_id_idx"');
    await queryRunner.query('UPDATE "repair_attachments" SET "repair_order_id" = "repair_steps"."repair_order_id" FROM "repair_steps" WHERE "repair_attachments"."repair_step_id" = "repair_steps"."id"');
    await queryRunner.query('ALTER TABLE "repair_attachments" ALTER COLUMN "repair_order_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "repair_attachments" DROP COLUMN "trade_in_request_id"');
    await queryRunner.query('ALTER TABLE "repair_attachments" DROP COLUMN "ecommerce_product_id"');
  }
}
