import type { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveLegacyUserStoreIdMigration implements MigrationInterface {
  name = "RemoveLegacyUserStoreIdMigration1741100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_store_id_fkey";
      ALTER TABLE "users" DROP COLUMN IF EXISTS "store_id";
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "store_id" uuid;
      UPDATE "users" SET "store_id" = "default_store_id" WHERE "store_id" IS NULL;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_store_id_fkey') THEN
          ALTER TABLE "users" ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }
}