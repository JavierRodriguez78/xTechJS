import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialUsersMigration implements MigrationInterface {
  name = "InitialUsersMigration1735862400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY,
        "email" varchar(320) NOT NULL UNIQUE,
        "display_name" varchar(160) NOT NULL,
        "role" varchar(64) NOT NULL,
        "active" boolean NOT NULL DEFAULT true
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "users"');
  }
}