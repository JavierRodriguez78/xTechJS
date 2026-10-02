import type { DataSource } from "@xtaskjs/typeorm";
import { loadConfig } from "../../shared/infrastructure/config/app-config.js";
import { StoreEntitySchema } from "../infrastructure/persistence/store-entity.js";

export interface StoreIssuer {
  legalName: string;
  taxId: string;
  establishmentAddress: string;
}

export async function resolveStoreIssuer(dataSource: DataSource, storeId?: string): Promise<StoreIssuer> {
  const config = loadConfig();
  const store = storeId ? await dataSource.getRepository(StoreEntitySchema).findOneBy({ id: storeId }) : undefined;
  if (!store) return { legalName: config.get("INVOICE_ISSUER_NAME"), taxId: config.get("INVOICE_ISSUER_TAX_ID"), establishmentAddress: config.get("INVOICE_ISSUER_ADDRESS") };
  const establishmentAddress = [store.addressStreet, [store.addressPostalCode, store.addressCity].filter(Boolean).join(" "), store.addressProvince, store.addressCountry].filter(Boolean).join(", ") || store.address;
  return { legalName: store.legalName ?? config.get("INVOICE_ISSUER_NAME"), taxId: store.taxId ?? config.get("INVOICE_ISSUER_TAX_ID"), establishmentAddress };
}