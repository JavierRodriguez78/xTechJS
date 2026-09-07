import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialCustomersMigration implements MigrationInterface {
  name = "InitialCustomersMigration1735948800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid PRIMARY KEY,
        "display_name" varchar(160) NOT NULL,
        "email" varchar(320) UNIQUE,
        "phone" varchar(64),
        "address" text,
        "tax_id" varchar(64) UNIQUE,
        "internal_notes" text,
        "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "customers"');
  }
}