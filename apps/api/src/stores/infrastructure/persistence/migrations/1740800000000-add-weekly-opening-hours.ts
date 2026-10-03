import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddWeeklyOpeningHoursMigration implements MigrationInterface {
  name = "AddWeeklyOpeningHoursMigration1740800000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "stores" ADD COLUMN "weekly_opening_hours" jsonb');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "stores" DROP COLUMN "weekly_opening_hours"');
  }
}