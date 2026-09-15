import { EntitySchema } from "typeorm";

export interface AdminConfigRecord {
  key: string;
  values: string[];
  updatedAt: Date;
}

export const AdminConfigEntitySchema = new EntitySchema<AdminConfigRecord>({
  name: "AdminConfig",
  tableName: "admin_config_values",
  columns: {
    key: { type: String, primary: true },
    values: { type: "jsonb" },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});
