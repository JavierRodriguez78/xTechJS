import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialRepairAttachmentsMigration implements MigrationInterface {
  name = "InitialRepairAttachmentsMigration1738300000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "repair_attachments" (
      "id" uuid PRIMARY KEY,
      "repair_order_id" uuid NOT NULL REFERENCES "repair_orders"("id") ON DELETE CASCADE,
      "uploader_id" uuid NOT NULL,
      "uploader_role" varchar(32) NOT NULL,
      "file_name" varchar(255) NOT NULL,
      "mime_type" varchar(120) NOT NULL,
      "size_bytes" bigint NOT NULL,
      "storage_key" varchar(500) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE INDEX "repair_attachments_repair_order_id_idx" ON "repair_attachments" ("repair_order_id", "created_at")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "repair_attachments"');
  }
}
