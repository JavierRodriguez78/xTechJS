import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvitationDeliveryStatusMigration implements MigrationInterface {
  name = "AddInvitationDeliveryStatusMigration1738600000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_registration_tokens" ADD COLUMN "delivery_status" varchar(32) NOT NULL DEFAULT 'sent'`);
    await queryRunner.query(`ALTER TABLE "customer_registration_tokens" ADD COLUMN "delivery_error" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_registration_tokens" DROP COLUMN "delivery_error"`);
    await queryRunner.query(`ALTER TABLE "customer_registration_tokens" DROP COLUMN "delivery_status"`);
  }
}