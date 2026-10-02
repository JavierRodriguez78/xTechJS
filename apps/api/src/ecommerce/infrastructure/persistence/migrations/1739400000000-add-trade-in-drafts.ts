import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTradeInDraftsMigration implements MigrationInterface {
  name = "AddTradeInDraftsMigration1739400000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE trade_in_requests ALTER COLUMN status SET DEFAULT 'draft'");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE trade_in_requests ALTER COLUMN status SET DEFAULT 'submitted'");
  }
}
