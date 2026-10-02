import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryMovementStoreMigration implements MigrationInterface {
  name = "AddInventoryMovementStoreMigration1740200000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "inventory_movements" ADD "store_id" uuid');
    await queryRunner.query(`UPDATE "inventory_movements" SET "store_id" = (SELECT "id" FROM "stores" ORDER BY "created_at" ASC LIMIT 1) WHERE "store_id" IS NULL`);
    await queryRunner.query('ALTER TABLE "inventory_movements" ALTER COLUMN "store_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id")');
    await queryRunner.query('CREATE INDEX "inventory_movements_store_id_created_at_idx" ON "inventory_movements" ("store_id", "created_at" DESC)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "inventory_movements_store_id_created_at_idx"');
    await queryRunner.query('ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_store_id_fkey"');
    await queryRunner.query('ALTER TABLE "inventory_movements" DROP COLUMN "store_id"');
  }
}