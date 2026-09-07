export interface Customer {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  internalNotes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerInput {
  displayName: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  internalNotes?: string;
  tags?: string[];
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;