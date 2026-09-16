import { EntitySchema } from "typeorm";

export interface DataProtectionConsentRecord {
  id: string;
  customerId: string;
  consentText: string;
  consentVersion: string;
  acceptedAt: Date;
  ipAddress: string | null;
  createdAt: Date;
}

// One immutable row per acceptance; never updated or overwritten, per LOPD-GDD/RGPD evidentiary requirement.
export const DataProtectionConsentEntitySchema = new EntitySchema<DataProtectionConsentRecord>({
  name: "DataProtectionConsent",
  tableName: "data_protection_consents",
  columns: {
    id: { type: "uuid", primary: true },
    customerId: { type: "uuid", name: "customer_id" },
    consentText: { type: "text", name: "consent_text" },
    consentVersion: { type: String, name: "consent_version" },
    acceptedAt: { type: "timestamptz", name: "accepted_at" },
    ipAddress: { type: String, name: "ip_address", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  }
});
