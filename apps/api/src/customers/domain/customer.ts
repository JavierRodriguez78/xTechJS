export type RegistrationStatus = "pending" | "completed";
export type CustomerAcquisitionChannel = "staff" | "self_service";
export type CustomerType = "individual" | "business";

export interface CustomerBillingDetails {
  billingName?: string | null;
  billingTaxId?: string | null;
  billingAddressStreet?: string | null;
  billingAddressPostalCode?: string | null;
  billingAddressCity?: string | null;
  billingAddressProvince?: string | null;
  billingAddressCountry?: string | null;
}

export interface Customer {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  addressStreet?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  addressCountry?: string | null;
  taxId: string | null;
  customerType?: CustomerType | null;
  internalNotes: string | null;
  registrationStatus: RegistrationStatus;
  acquisitionChannel: CustomerAcquisitionChannel;
  originStoreId: string | null;
  billingName?: string | null;
  billingTaxId?: string | null;
  billingAddressStreet?: string | null;
  billingAddressPostalCode?: string | null;
  billingAddressCity?: string | null;
  billingAddressProvince?: string | null;
  billingAddressCountry?: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerInput {
  originStoreId?: string | null;
  displayName: string;
  email: string;
  phone?: string;
  addressStreet?: string;
  addressPostalCode?: string;
  addressCity?: string;
  addressProvince?: string;
  addressCountry?: string;
  taxId?: string;
  customerType?: CustomerType;
  internalNotes?: string;
  registrationStatus?: RegistrationStatus;
  acquisitionChannel?: CustomerAcquisitionChannel;
  billingName?: string;
  billingTaxId?: string;
  billingAddressStreet?: string;
  billingAddressPostalCode?: string;
  billingAddressCity?: string;
  billingAddressProvince?: string;
  billingAddressCountry?: string;
  tags?: string[];
}

export type UpdateCustomerInput = Partial<CreateCustomerInput & { registrationStatus: RegistrationStatus }>;