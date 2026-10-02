import type { MigrationInterface, QueryRunner } from "typeorm";
export class AddCustomerOriginStoreMigration implements MigrationInterface {
  name = "AddCustomerOriginStoreMigration1740400000000";
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE "customers" ADD "origin_store_id" uuid REFERENCES "stores"("id") ON DELETE SET NULL'); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE "customers" DROP COLUMN "origin_store_id"'); }
}