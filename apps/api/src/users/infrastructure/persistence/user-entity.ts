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
    active: { type: Boolean, default: true },
    passwordHash: { type: String, name: "password_hash", select: false }
  }
});