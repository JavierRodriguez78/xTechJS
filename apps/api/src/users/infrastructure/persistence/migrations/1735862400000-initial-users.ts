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
        "active" boolean NOT NULL DEFAULT true,
        "password_hash" varchar(255) NOT NULL
      );
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY,
        "actor_id" uuid NOT NULL REFERENCES "users"("id"),
        "target_id" uuid REFERENCES "users"("id"),
        "action" varchar(128) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "users"');
  }
}