export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  notes: string | null;
  externalRef: string | null;
  website: string | null;
  legalName: string | null;
  taxId: string | null;
  addressStreet: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  addressProvince: string | null;
  addressCountry: string | null;
  paymentTermDays: number | null;
  category: string | null;
  active: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  externalRef?: string | null;
  website?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  secondaryPhone?: string | null;
  addressStreet?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  addressCountry?: string | null;
  paymentTermDays?: number | null;
  category?: string | null;
}

export interface UpdateSupplierInput {
  name?: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  addressStreet?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  addressCountry?: string | null;
  paymentTermDays?: number | null;
  category?: string | null;
  notes?: string | null;
  website?: string | null;
}

export interface SupplierListOptions {
  query?: string;
  category?: string;
  active?: boolean;
}
