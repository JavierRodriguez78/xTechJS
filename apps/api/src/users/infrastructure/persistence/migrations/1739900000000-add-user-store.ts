import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserStoreMigration implements MigrationInterface {
  name = "AddUserStoreMigration1739900000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "store_id" uuid');
    await queryRunner.query('ALTER TABLE "users" ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_store_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "store_id"');
  }
}