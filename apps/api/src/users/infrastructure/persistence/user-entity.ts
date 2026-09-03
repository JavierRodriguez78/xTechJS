import { EntitySchema } from "typeorm";
import type { User } from "../../domain/user.js";

export const UserEntitySchema = new EntitySchema<User>({
  name: "User",
  tableName: "users",
  columns: {
    id: { type: "uuid", primary: true },
    email: { type: String, unique: true },
    displayName: { type: String, name: "display_name" },
    role: { type: String },
    active: { type: Boolean, default: true }
  }
});