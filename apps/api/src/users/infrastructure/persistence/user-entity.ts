import { EntitySchema } from "typeorm";
import type { UserCredentials } from "../../domain/user.js";

export const UserEntitySchema = new EntitySchema<UserCredentials>({
  name: "User",
  tableName: "users",
  columns: {
    id: { type: "uuid", primary: true },
    email: { type: String, unique: true },
    displayName: { type: String, name: "display_name" },
    role: { type: String },
    defaultStoreId: { type: "uuid", name: "default_store_id", nullable: true },
    storeAccess: { type: "uuid", name: "store_access", array: true, nullable: true },
    active: { type: Boolean, default: true },
    phone: { type: String, nullable: true },
    nationalId: { type: String, name: "national_id", nullable: true, select: false },
    addressStreet: { type: String, name: "address_street", nullable: true },
    addressPostalCode: { type: String, name: "address_postal_code", nullable: true },
    addressCity: { type: String, name: "address_city", nullable: true },
    addressProvince: { type: String, name: "address_province", nullable: true },
    addressCountry: { type: String, name: "address_country", nullable: true },
    hiredAt: { type: "timestamptz", name: "hired_at", nullable: true },
    deactivatedAt: { type: "timestamptz", name: "deactivated_at", nullable: true },
    passwordHash: { type: String, name: "password_hash", select: false }
  }
});