import type { MigrationInterface, QueryRunner } from "typeorm";

export class CompleteStockTransferLifecycleMigration implements MigrationInterface {
  name = "CompleteStockTransferLifecycleMigration1740500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ DECLARE constraint_name text; BEGIN FOR constraint_name IN SELECT conname FROM pg_constraint WHERE conrelid = 'stock_transfer_orders'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%status%' LOOP EXECUTE format('ALTER TABLE stock_transfer_orders DROP CONSTRAINT %I', constraint_name); END LOOP; END $$`);
    await queryRunner.query('ALTER TABLE "stock_transfer_orders" ADD COLUMN "sent_at" timestamptz, ADD COLUMN "received_at" timestamptz');
    await queryRunner.query("UPDATE \"stock_transfer_orders\" SET \"status\" = 'received', \"received_at\" = COALESCE(\"completed_at\", \"created_at\") WHERE \"status\" = 'completed'");
    await queryRunner.query("ALTER TABLE \"stock_transfer_orders\" ADD CONSTRAINT \"stock_transfer_orders_status_check\" CHECK (\"status\" IN ('draft', 'in_transit', 'received', 'cancelled'))");
    await queryRunner.query('ALTER TABLE "inventory_movements" ADD COLUMN "stock_transfer_order_id" uuid REFERENCES "stock_transfer_orders"("id")');
    await queryRunner.query('CREATE INDEX "inventory_movements_stock_transfer_order_id_idx" ON "inventory_movements" ("stock_transfer_order_id")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "inventory_movements_stock_transfer_order_id_idx"');
    await queryRunner.query('ALTER TABLE "inventory_movements" DROP COLUMN "stock_transfer_order_id"');
    await queryRunner.query('ALTER TABLE "stock_transfer_orders" DROP CONSTRAINT "stock_transfer_orders_status_check"');
    await queryRunner.query("UPDATE \"stock_transfer_orders\" SET \"status\" = 'completed' WHERE \"status\" = 'received'");
    await queryRunner.query("ALTER TABLE \"stock_transfer_orders\" ADD CONSTRAINT \"stock_transfer_orders_status_check\" CHECK (\"status\" IN ('draft', 'completed', 'cancelled'))");
    await queryRunner.query('ALTER TABLE "stock_transfer_orders" DROP COLUMN "received_at", DROP COLUMN "sent_at"');
  }
}