import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialStoresMigration implements MigrationInterface {
  name = "InitialStoresMigration1739800000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "stores" ("id" uuid PRIMARY KEY, "name" varchar(160) NOT NULL, "address" varchar(500) NOT NULL, "phone" varchar(80), "tax_id" varchar(80), "invoice_series_prefix" varchar(32) NOT NULL, "active" boolean NOT NULL DEFAULT true, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "stores_invoice_series_prefix_key" UNIQUE ("invoice_series_prefix"))`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE "stores"'); }
}