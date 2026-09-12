import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerRegistrationTokensMigration implements MigrationInterface {
  name = "AddCustomerRegistrationTokensMigration1737500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customer_registration_tokens" (
        "id" uuid PRIMARY KEY,
        "customer_id" uuid NOT NULL,
        "token_hash" varchar(512) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_customer_registration_tokens_customer"
          FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_customer_registration_tokens_token_hash"
      ON "customer_registration_tokens" ("token_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_customer_registration_tokens_customer_expires"
      ON "customer_registration_tokens" ("customer_id", "expires_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "customer_registration_tokens"');
  }
}
