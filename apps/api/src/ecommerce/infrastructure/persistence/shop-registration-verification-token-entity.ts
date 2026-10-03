import { EntitySchema } from "typeorm";

export interface ShopRegistrationVerificationToken {
  id: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  verifiedAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
}

export const ShopRegistrationVerificationTokenEntitySchema = new EntitySchema<ShopRegistrationVerificationToken>({
  name: "ShopRegistrationVerificationToken",
  tableName: "shop_registration_verification_tokens",
  columns: {
    id: { type: "uuid", primary: true },
    email: { type: String, length: 320 },
    tokenHash: { type: String, name: "token_hash", length: 64, unique: true },
    expiresAt: { type: "timestamptz", name: "expires_at" },
    verifiedAt: { type: "timestamptz", name: "verified_at", nullable: true },
    usedAt: { type: "timestamptz", name: "used_at", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  },
  indices: [{ columns: ["email", "expiresAt"], name: "IDX_shop_registration_verification_tokens_email_expiry" }]
});
