import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Las plantillas de notificacion dejan de ser una lista de nombres en
 * `admin_config_values` y pasan a tener asunto y cuerpo editables, de forma que
 * el cambio de estado de una reparacion pueda enviar el aviso real al cliente.
 */
export class AddNotificationTemplatesMigration implements MigrationInterface {
  name = "AddNotificationTemplatesMigration1738700000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_templates" (
        "key" varchar(160) PRIMARY KEY,
        "subject" varchar(320) NOT NULL,
        "body" text NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customer_notifications" (
        "id" uuid PRIMARY KEY,
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "repair_order_id" uuid REFERENCES "repair_orders"("id") ON DELETE SET NULL,
        "template_key" varchar(160) NOT NULL,
        "recipient" varchar(320) NOT NULL,
        "subject" varchar(320) NOT NULL,
        "status" varchar(32) NOT NULL,
        "error_message" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_customer_notifications_customer" ON "customer_notifications" ("customer_id")`);

    const defaults: { key: string; subject: string; body: string }[] = [
      {
        key: "repair.status.quoted",
        subject: "Presupuesto listo para {{deviceBrand}} {{deviceModel}}",
        body: "Hola {{customerName}},\n\nYa tienes el presupuesto de la reparacion de tu {{deviceType}} {{deviceBrand}} {{deviceModel}}.\n\nPuedes revisarlo y aprobarlo desde tu area de cliente: {{portalUrl}}\n\nGracias por confiar en xTechJS."
      },
      {
        key: "repair.status.repaired",
        subject: "Tu {{deviceBrand}} {{deviceModel}} ya esta reparado",
        body: "Hola {{customerName}},\n\nHemos terminado la reparacion de tu {{deviceType}} {{deviceBrand}} {{deviceModel}}.\n\n{{statusNote}}\n\nPuedes pasar a recogerlo cuando te venga bien.\n\nGracias por confiar en xTechJS."
      },
      {
        key: "repair.status.delivered",
        subject: "Entrega confirmada de {{deviceBrand}} {{deviceModel}}",
        body: "Hola {{customerName}},\n\nConfirmamos la entrega de tu {{deviceType}} {{deviceBrand}} {{deviceModel}}.\n\nSi necesitas la factura o tienes cualquier duda, la tienes disponible en tu area de cliente: {{portalUrl}}\n\nGracias por confiar en xTechJS."
      }
    ];

    for (const template of defaults) {
      await queryRunner.query(
        `INSERT INTO "notification_templates" ("key", "subject", "body", "enabled") VALUES ($1, $2, $3, true)`,
        [template.key, template.subject, template.body]
      );
    }

    // La lista de nombres de plantilla ya no describe nada aplicable.
    await queryRunner.query(`DELETE FROM "admin_config_values" WHERE "key" = 'notificationTemplates'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_customer_notifications_customer"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates"`);
  }
}
