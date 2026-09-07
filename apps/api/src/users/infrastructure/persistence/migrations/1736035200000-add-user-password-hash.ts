import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPasswordHashMigration implements MigrationInterface {
  name = "AddUserPasswordHashMigration1736035200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("users", "password_hash")) return;
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255) NOT NULL DEFAULT \'\'');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("users", "password_hash"))) return;
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "password_hash"');
  }
}