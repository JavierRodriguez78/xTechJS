import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerAcquisitionChannelMigration implements MigrationInterface {
  name = "AddCustomerAcquisitionChannelMigration1739000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE \"customers\" ADD COLUMN \"acquisition_channel\" varchar(32) NOT NULL DEFAULT 'staff'");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN "acquisition_channel"');
  }
}
