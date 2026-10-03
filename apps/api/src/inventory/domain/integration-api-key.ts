export type IntegrationApiScope = "spare-parts-catalog:write";

export interface IntegrationApiKey {
  id: string;
  name: string;
  keyHash: string;
  scope: IntegrationApiScope;
  active: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export type PublicIntegrationApiKey = Omit<IntegrationApiKey, "keyHash">;
