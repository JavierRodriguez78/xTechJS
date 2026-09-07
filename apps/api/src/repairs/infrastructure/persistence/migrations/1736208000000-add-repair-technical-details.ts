import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRepairTechnicalDetailsMigration implements MigrationInterface {
  name = "AddRepairTechnicalDetailsMigration1736208000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "repair_orders" ADD COLUMN "technician_id" uuid REFERENCES "users"("id")');
    await queryRunner.query('ALTER TABLE "repair_orders" ADD COLUMN "diagnosis" text');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "repair_orders" DROP COLUMN "diagnosis"');
    await queryRunner.query('ALTER TABLE "repair_orders" DROP COLUMN "technician_id"');
  }
}