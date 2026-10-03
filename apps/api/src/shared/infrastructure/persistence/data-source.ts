import { DataSource } from "typeorm";
import { registerTypeOrmDataSource, type XTaskTypeOrmDataSourceOptions } from "@xtaskjs/typeorm";
import { loadConfig } from "../config/app-config.js";
import { InitialCustomersMigration } from "../../../customers/infrastructure/persistence/migrations/1735948800000-initial-customers.js";
import { CustomerEntitySchema } from "../../../customers/infrastructure/persistence/customer-entity.js";
import { AddCustomerRegistrationTokensMigration } from "../../../customers/infrastructure/persistence/migrations/1737500000000-add-customer-registration-tokens.js";
import { AddCustomerRegistrationDetailsMigration } from "../../../customers/infrastructure/persistence/migrations/1737600000000-add-customer-registration-details.js";
import { CustomerRegistrationTokenEntitySchema } from "../../../customers/infrastructure/persistence/customer-registration-token-entity.js";
import { InitialRepairOrdersMigration } from "../../../repairs/infrastructure/persistence/migrations/1736121600000-initial-repair-orders.js";
import { AddRepairTechnicalDetailsMigration } from "../../../repairs/infrastructure/persistence/migrations/1736208000000-add-repair-technical-details.js";
import { InitialRepairQuotesMigration } from "../../../repairs/infrastructure/persistence/migrations/1736294400000-initial-repair-quotes.js";
import { RepairConditionRecordEntitySchema, RepairDeviceSecretEntitySchema, RepairOrderEntitySchema, RepairStatusEventEntitySchema } from "../../../repairs/infrastructure/persistence/repair-order-entity.js";
import { RepairStepEntitySchema } from "../../../repairs/infrastructure/persistence/repair-step-entity.js";
import { AddRepairStepsMigration } from "../../../repairs/infrastructure/persistence/migrations/1738800000000-add-repair-steps.js";
import { RepairQuoteEntitySchema } from "../../../repairs/infrastructure/persistence/repair-quote-entity.js";
import { AddUserPasswordHashMigration } from "../../../users/infrastructure/persistence/migrations/1736035200000-add-user-password-hash.js";
import { InitialUsersMigration } from "../../../users/infrastructure/persistence/migrations/1735862400000-initial-users.js";
import { UserEntitySchema } from "../../../users/infrastructure/persistence/user-entity.js";
import { InventoryItemEntitySchema, InventoryMovementEntitySchema, StoreInventoryStockEntitySchema } from "../../../inventory/infrastructure/persistence/inventory-entity.js";
import { InitialInventoryMigration } from "../../../inventory/infrastructure/persistence/migrations/1736553600000-initial-inventory.js";
import { AddRepairToInventoryMovementsMigration } from "../../../inventory/infrastructure/persistence/migrations/1736640000000-add-repair-to-inventory-movements.js";
import { SupplierEntitySchema } from "../../../inventory/infrastructure/persistence/supplier-entity.js";
import { InitialSuppliersMigration } from "../../../inventory/infrastructure/persistence/migrations/1736726400000-initial-suppliers.js";
import { PurchaseOrderEntitySchema } from "../../../inventory/infrastructure/persistence/purchase-order-entity.js";
import { InitialPurchaseOrdersMigration } from "../../../inventory/infrastructure/persistence/migrations/1736812800000-initial-purchase-orders.js";
import { PaymentEntitySchema } from "../../../payments/infrastructure/persistence/payment-entity.js";
import { InitialPaymentsMigration } from "../../../payments/infrastructure/persistence/migrations/1736899200000-initial-payments.js";
import { CashRegisterEntitySchema } from "../../../payments/infrastructure/persistence/cash-register-entity.js";
import { InitialCashRegistersMigration } from "../../../payments/infrastructure/persistence/migrations/1736985600000-initial-cash-registers.js";
import { AddInvoiceNumberingMigration } from "../../../payments/infrastructure/persistence/migrations/1737700000000-add-invoice-numbering.js";
import { AddInvoiceEmailsMigration } from "../../../payments/infrastructure/persistence/migrations/1737800000000-add-invoice-emails.js";
import { AddInvoiceLinesMigration } from "../../../payments/infrastructure/persistence/migrations/1737900000000-add-invoice-lines.js";
import { AddAdminConfigMigration } from "../../../users/infrastructure/persistence/migrations/1738000000000-add-admin-config.js";
import { AdminConfigEntitySchema } from "../../../users/infrastructure/persistence/admin-config-entity.js";
import { InvoiceEmailEntitySchema } from "../../../payments/infrastructure/persistence/invoice-email-entity.js";
import { AddDataProtectionConsentsMigration } from "../../../customers/infrastructure/persistence/migrations/1738100000000-add-data-protection-consents.js";
import { DataProtectionConsentEntitySchema } from "../../../customers/infrastructure/persistence/data-protection-consent-entity.js";
import { InitialChatMessagesMigration } from "../../../chat/infrastructure/persistence/migrations/1738200000000-initial-chat-messages.js";
import { ChatMessageEntitySchema } from "../../../chat/infrastructure/persistence/chat-message-entity.js";
import { InitialRepairAttachmentsMigration } from "../../../attachments/infrastructure/persistence/migrations/1738300000000-initial-repair-attachments.js";
import { RepairAttachmentEntitySchema } from "../../../attachments/infrastructure/persistence/repair-attachment-entity.js";
import { AddInvoiceDraftsAndMaterialPricesMigration } from "../../../payments/infrastructure/persistence/migrations/1738400000000-add-invoice-drafts-and-material-prices.js";
import { InvoiceDraftEntitySchema } from "../../../payments/infrastructure/persistence/invoice-draft-entity.js";
import { AddInvoiceRectificationsMigration } from "../../../payments/infrastructure/persistence/migrations/1738500000000-add-invoice-rectifications.js";
import { AddInvitationDeliveryStatusMigration } from "../../../customers/infrastructure/persistence/migrations/1738600000000-add-invitation-delivery-status.js";
import { AddNotificationTemplatesMigration } from "../../../notifications/infrastructure/persistence/migrations/1738700000000-add-notification-templates.js";
import { NotificationTemplateEntitySchema } from "../../../notifications/infrastructure/persistence/notification-template-entity.js";
import { CustomerNotificationEntitySchema } from "../../../notifications/infrastructure/persistence/customer-notification-entity.js";
import { AddRepairStepToAttachmentsMigration } from "../../../attachments/infrastructure/persistence/migrations/1738900000000-add-repair-step-to-attachments.js";
import { AddCustomerAcquisitionChannelMigration } from "../../../customers/infrastructure/persistence/migrations/1739000000000-add-customer-acquisition-channel.js";
import { EcommerceOrderEntitySchema, EcommerceOrderLineEntitySchema, EcommerceProductEntitySchema } from "../../../ecommerce/infrastructure/persistence/ecommerce-entity.js";
import { InitialEcommerceMigration } from "../../../ecommerce/infrastructure/persistence/migrations/1739100000000-initial-ecommerce.js";
import { TradeInPayoutEntitySchema, TradeInRequestEntitySchema } from "../../../ecommerce/infrastructure/persistence/trade-in-entity.js";
import { AddTradeInRequestsMigration } from "../../../ecommerce/infrastructure/persistence/migrations/1739200000000-add-trade-in-requests.js";
import { AddGenericAttachmentOwnersMigration } from "../../../attachments/infrastructure/persistence/migrations/1739300000000-add-generic-attachment-owners.js";
import { AddTradeInDraftsMigration } from "../../../ecommerce/infrastructure/persistence/migrations/1739400000000-add-trade-in-drafts.js";
import { AddEcommerceInvoiceNumberingMigration } from "../../../ecommerce/infrastructure/persistence/migrations/1739500000000-add-ecommerce-invoice-numbering.js";
import { AddEcommerceInvoiceSequenceMigration } from "../../../ecommerce/infrastructure/persistence/migrations/1739600000000-add-ecommerce-invoice-sequence.js";
import { AddRepairIntakeDetailsMigration } from "../../../repairs/infrastructure/persistence/migrations/1739700000000-add-repair-intake-details.js";
import { StoreEntitySchema } from "../../../stores/infrastructure/persistence/store-entity.js";
import { InitialStoresMigration } from "../../../stores/infrastructure/persistence/migrations/1739800000000-initial-stores.js";
import { AddUserStoreMigration } from "../../../users/infrastructure/persistence/migrations/1739900000000-add-user-store.js";
import { AddRepairStoreMigration } from "../../../repairs/infrastructure/persistence/migrations/1740000000000-add-repair-store.js";
import { AddStoreInventoryStockMigration } from "../../../inventory/infrastructure/persistence/migrations/1740100000000-add-store-inventory-stock.js";
import { AddInventoryMovementStoreMigration } from "../../../inventory/infrastructure/persistence/migrations/1740200000000-add-inventory-movement-store.js";
import { AddStockTransfersMigration } from "../../../inventory/infrastructure/persistence/migrations/1740300000000-add-stock-transfers.js";
import { AddCustomerOriginStoreMigration } from "../../../customers/infrastructure/persistence/migrations/1740400000000-add-customer-origin-store.js";
import { CompleteStockTransferLifecycleMigration } from "../../../inventory/infrastructure/persistence/migrations/1740500000000-complete-stock-transfer-lifecycle.js";
import { ExpandStoreProfileMigration } from "../../../stores/infrastructure/persistence/migrations/1740600000000-expand-store-profile.js";
import { SeedAddressCatalogMigration } from "../../../stores/infrastructure/persistence/migrations/1740700000000-seed-address-catalog.js";
import { AddWeeklyOpeningHoursMigration } from "../../../stores/infrastructure/persistence/migrations/1740800000000-add-weekly-opening-hours.js";
import { AddEmployeeProfileAndStoreAccessMigration } from "../../../users/infrastructure/persistence/migrations/1740900000000-add-employee-profile-and-store-access.js";
import { ScopePurchasesAndCashByStoreMigration } from "../../../inventory/infrastructure/persistence/migrations/1741000000000-scope-purchases-and-cash-by-store.js";
import { RemoveLegacyUserStoreIdMigration } from "../../../users/infrastructure/persistence/migrations/1741100000000-remove-legacy-user-store-id.js";
import { StockTransferLineEntitySchema, StockTransferOrderEntitySchema } from "../../../inventory/infrastructure/persistence/stock-transfer-entity.js";

const config = loadConfig();

const dataSourceOptions: XTaskTypeOrmDataSourceOptions = {
  name: "default",
  type: "postgres",
  host: config.get("POSTGRES_HOST"),
  port: config.get("POSTGRES_PORT"),
  database: config.get("POSTGRES_DB"),
  username: config.get("POSTGRES_USER"),
  password: config.get("POSTGRES_PASSWORD"),
  entities: [UserEntitySchema, StoreEntitySchema, CustomerEntitySchema, CustomerRegistrationTokenEntitySchema, RepairOrderEntitySchema, RepairStatusEventEntitySchema, RepairConditionRecordEntitySchema, RepairDeviceSecretEntitySchema, RepairStepEntitySchema, RepairQuoteEntitySchema, InventoryItemEntitySchema, InventoryMovementEntitySchema, StoreInventoryStockEntitySchema, StockTransferOrderEntitySchema, StockTransferLineEntitySchema, SupplierEntitySchema, PurchaseOrderEntitySchema, PaymentEntitySchema, CashRegisterEntitySchema, InvoiceEmailEntitySchema, AdminConfigEntitySchema, DataProtectionConsentEntitySchema, ChatMessageEntitySchema, RepairAttachmentEntitySchema, InvoiceDraftEntitySchema, NotificationTemplateEntitySchema, CustomerNotificationEntitySchema, EcommerceProductEntitySchema, EcommerceOrderEntitySchema, EcommerceOrderLineEntitySchema, TradeInRequestEntitySchema, TradeInPayoutEntitySchema],
  migrations: [InitialUsersMigration, InitialCustomersMigration, AddUserPasswordHashMigration, AddCustomerRegistrationTokensMigration, AddCustomerRegistrationDetailsMigration, InitialRepairOrdersMigration, AddRepairTechnicalDetailsMigration, InitialRepairQuotesMigration, InitialInventoryMigration, AddRepairToInventoryMovementsMigration, InitialSuppliersMigration, InitialPurchaseOrdersMigration, InitialPaymentsMigration, InitialCashRegistersMigration, AddInvoiceNumberingMigration, AddInvoiceEmailsMigration, AddInvoiceLinesMigration, AddAdminConfigMigration, AddDataProtectionConsentsMigration, InitialChatMessagesMigration, InitialRepairAttachmentsMigration, AddInvoiceDraftsAndMaterialPricesMigration, AddInvoiceRectificationsMigration, AddInvitationDeliveryStatusMigration, AddNotificationTemplatesMigration, AddRepairStepsMigration, AddCustomerAcquisitionChannelMigration, InitialEcommerceMigration, AddTradeInRequestsMigration, AddGenericAttachmentOwnersMigration, AddTradeInDraftsMigration, AddEcommerceInvoiceNumberingMigration, AddEcommerceInvoiceSequenceMigration, AddRepairIntakeDetailsMigration, InitialStoresMigration, AddUserStoreMigration, AddRepairStoreMigration, AddStoreInventoryStockMigration, AddInventoryMovementStoreMigration, AddStockTransfersMigration, AddCustomerOriginStoreMigration, CompleteStockTransferLifecycleMigration, ExpandStoreProfileMigration, SeedAddressCatalogMigration, AddWeeklyOpeningHoursMigration, AddEmployeeProfileAndStoreAccessMigration, ScopePurchasesAndCashByStoreMigration, RemoveLegacyUserStoreIdMigration],
  synchronize: false,
  initializeOnServerStart: true,
  runMigrationsOnServerStart: config.get("RUN_MIGRATIONS_ON_STARTUP")
};

registerTypeOrmDataSource(dataSourceOptions);

export const appDataSource = new DataSource(dataSourceOptions);

async function runMigrations(): Promise<void> {
  await appDataSource.initialize();
  await appDataSource.runMigrations();
  await appDataSource.destroy();
}

if (process.argv[1]?.endsWith("data-source.js")) {
  runMigrations().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}