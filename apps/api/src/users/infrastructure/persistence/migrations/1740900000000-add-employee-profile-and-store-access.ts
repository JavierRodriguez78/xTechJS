import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmployeeProfileAndStoreAccessMigration implements MigrationInterface {
  name = "AddEmployeeProfileAndStoreAccessMigration1740900000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "default_store_id" uuid,
        ADD COLUMN "store_access" uuid[],
        ADD COLUMN "phone" varchar(80),
        ADD COLUMN "national_id" varchar(32),
        ADD COLUMN "address_street" varchar(500),
        ADD COLUMN "address_postal_code" varchar(5),
        ADD COLUMN "address_city" varchar(120),
        ADD COLUMN "address_province" varchar(120),
        ADD COLUMN "address_country" varchar(80),
        ADD COLUMN "hired_at" timestamptz,
        ADD COLUMN "deactivated_at" timestamptz,
        ADD CONSTRAINT "users_default_store_id_fkey" FOREIGN KEY ("default_store_id") REFERENCES "stores"("id") ON DELETE SET NULL;

      UPDATE "users"
      SET
        "default_store_id" = COALESCE("store_id", CASE WHEN "role" = 'technician' THEN (SELECT "id" FROM "stores" ORDER BY "created_at", "id" LIMIT 1) END),
        "store_access" = CASE
          WHEN "role" = 'admin' AND "store_id" IS NULL THEN NULL
          WHEN "store_id" IS NOT NULL THEN ARRAY["store_id"]::uuid[]
          WHEN "role" = 'technician' THEN ARRAY[(SELECT "id" FROM "stores" ORDER BY "created_at", "id" LIMIT 1)]::uuid[]
          ELSE ARRAY[]::uuid[]
        END,
        "address_country" = CASE WHEN "role" IN ('admin', 'technician') THEN 'España' ELSE NULL END
      WHERE "default_store_id" IS NULL AND "store_access" IS NULL;

      CREATE INDEX "users_store_access_gin_idx" ON "users" USING GIN ("store_access") WHERE "store_access" IS NOT NULL;
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_store_id_fkey";
      ALTER TABLE "users" DROP COLUMN "store_id";
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "users_store_access_gin_idx";
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_store_id_fkey";
      ALTER TABLE "users" DROP COLUMN IF EXISTS "store_id";
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_default_store_id_fkey";
      ALTER TABLE "users"
        DROP COLUMN "deactivated_at",
        DROP COLUMN "hired_at",
        DROP COLUMN "address_country",
        DROP COLUMN "address_province",
        DROP COLUMN "address_city",
        DROP COLUMN "address_postal_code",
        DROP COLUMN "address_street",
        DROP COLUMN "national_id",
        DROP COLUMN "phone",
        DROP COLUMN "store_access",
        DROP COLUMN "default_store_id";
    `);
  }
}