import { EntitySchema } from "typeorm";

export interface CustomerRegistrationTokenRecordEntity {
  id: string;
  customerId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export const CustomerRegistrationTokenEntitySchema = new EntitySchema<CustomerRegistrationTokenRecordEntity>({
  name: "CustomerRegistrationToken",
  tableName: "customer_registration_tokens",
  columns: {
    id: { type: "uuid", primary: true },
    customerId: { type: "uuid", name: "customer_id" },
    tokenHash: { type: String, name: "token_hash" },
    expiresAt: { type: "timestamptz", name: "expires_at" },
    usedAt: { type: "timestamptz", name: "used_at", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  },
  indices: [
    { columns: ["customerId", "expiresAt"], name: "IDX_customer_registration_tokens_customer_expires" },
    { columns: ["tokenHash"], unique: true, name: "UQ_customer_registration_tokens_token_hash" }
  ]
});
