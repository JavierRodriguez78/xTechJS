import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminConfigMigration implements MigrationInterface {
  name = "AddAdminConfigMigration1738000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "admin_config_values" (
      "key" varchar(120) PRIMARY KEY,
      "values" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "admin_config_values"');
  }
}
