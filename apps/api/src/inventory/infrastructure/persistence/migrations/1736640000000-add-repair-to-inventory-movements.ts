import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRepairToInventoryMovementsMigration implements MigrationInterface {
  name = "AddRepairToInventoryMovementsMigration1736640000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "inventory_movements" ADD COLUMN "repair_order_id" uuid REFERENCES "repair_orders"("id") ON DELETE SET NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "inventory_movements" DROP COLUMN "repair_order_id"');
  }
}