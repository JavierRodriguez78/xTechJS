import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSuppliersMigration implements MigrationInterface {
  name = "InitialSuppliersMigration1736726400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "inventory_suppliers" (
      "id" uuid PRIMARY KEY, "name" varchar(180) NOT NULL UNIQUE, "email" varchar(320),
      "phone" varchar(64), "notes" text, "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "inventory_suppliers"');
  }
}
