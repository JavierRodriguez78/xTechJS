export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  taxId: string | null;
  invoiceSeriesPrefix: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveStoreInput {
  name: string;
  address: string;
  phone?: string;
  taxId?: string;
  invoiceSeriesPrefix: string;
  active?: boolean;
}