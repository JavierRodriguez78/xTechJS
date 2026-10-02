export type RegistrationStatus = "pending" | "completed";
export type CustomerAcquisitionChannel = "staff" | "self_service";

export interface CustomerBillingDetails {
  billingName?: string | null;
  billingTaxId?: string | null;
  billingAddress?: string | null;
  billingPostalCode?: string | null;
  billingCity?: string | null;
  billingProvince?: string | null;
}

export interface Customer {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  internalNotes: string | null;
  registrationStatus: RegistrationStatus;
  acquisitionChannel: CustomerAcquisitionChannel;
  billingName?: string | null;
  billingTaxId?: string | null;
  billingAddress?: string | null;
  billingPostalCode?: string | null;
  billingCity?: string | null;
  billingProvince?: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerInput {
  displayName: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string;
  internalNotes?: string;
  registrationStatus?: RegistrationStatus;
  acquisitionChannel?: CustomerAcquisitionChannel;
  billingName?: string;
  billingTaxId?: string;
  billingAddress?: string;
  billingPostalCode?: string;
  billingCity?: string;
  billingProvince?: string;
  tags?: string[];
}

export type UpdateCustomerInput = Partial<CreateCustomerInput & { registrationStatus: RegistrationStatus }>;