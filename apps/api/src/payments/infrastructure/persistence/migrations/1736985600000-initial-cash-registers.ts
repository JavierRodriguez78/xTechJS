import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialCashRegistersMigration implements MigrationInterface {
  name = "InitialCashRegistersMigration1736985600000";
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`CREATE TABLE "cash_registers" ("id" uuid PRIMARY KEY, "business_date" date NOT NULL UNIQUE, "status" varchar(16) NOT NULL, "opened_at" timestamptz NOT NULL DEFAULT now(), "closed_at" timestamptz, "paid_cents" integer NOT NULL DEFAULT 0, "refunded_cents" integer NOT NULL DEFAULT 0, "net_cents" integer NOT NULL DEFAULT 0)`); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE "cash_registers"'); }
}
