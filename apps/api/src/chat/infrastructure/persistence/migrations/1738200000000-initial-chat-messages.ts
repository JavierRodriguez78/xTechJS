import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialChatMessagesMigration implements MigrationInterface {
  name = "InitialChatMessagesMigration1738200000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "chat_messages" (
      "id" uuid PRIMARY KEY,
      "repair_order_id" uuid NOT NULL REFERENCES "repair_orders"("id") ON DELETE CASCADE,
      "sender_id" uuid NOT NULL,
      "sender_role" varchar(32) NOT NULL,
      "sender_name" varchar(160) NOT NULL,
      "body" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE INDEX "chat_messages_repair_order_id_idx" ON "chat_messages" ("repair_order_id", "created_at")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "chat_messages"');
  }
}
