import type { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandStoreProfileMigration implements MigrationInterface {
  name = "ExpandStoreProfileMigration1740600000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "stores" ADD COLUMN "legal_name" varchar(200), ADD COLUMN "address_street" varchar(250) NOT NULL DEFAULT \'\', ADD COLUMN "address_postal_code" varchar(5) NOT NULL DEFAULT \'\', ADD COLUMN "address_city" varchar(120) NOT NULL DEFAULT \'\', ADD COLUMN "address_province" varchar(120) NOT NULL DEFAULT \'\', ADD COLUMN "address_country" varchar(80) NOT NULL DEFAULT \'España\', ADD COLUMN "email" varchar(320), ADD COLUMN "opening_hours" varchar(500), ADD COLUMN "logo_url" varchar(2000), ADD COLUMN "verifactu_system_id" varchar(120)');
    await queryRunner.query('UPDATE "stores" SET "address_street" = "address"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "stores" DROP COLUMN "verifactu_system_id", DROP COLUMN "logo_url", DROP COLUMN "opening_hours", DROP COLUMN "email", DROP COLUMN "address_country", DROP COLUMN "address_province", DROP COLUMN "address_city", DROP COLUMN "address_postal_code", DROP COLUMN "address_street", DROP COLUMN "legal_name"');
  }
}