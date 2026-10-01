import type { CreateCustomerInput, Customer, UpdateCustomerInput } from "../domain/customer.js";

export interface CustomerListOptions {
  query?: string;
  registrationStatus?: Customer["registrationStatus"];
  tag?: string;
  createdFrom?: Date;
  createdTo?: Date;
  sort: "displayName:asc" | "displayName:desc" | "createdAt:asc" | "createdAt:desc";
  page: number;
  pageSize: number;
}

export interface CustomerPage {
  items: readonly Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewCustomerRecord extends CreateCustomerInput {
  id: string;
}

export interface CustomerRepository {
  create(input: NewCustomerRecord): Promise<Customer>;
  findAll(): Promise<readonly Customer[]>;
  findPage(options: CustomerListOptions): Promise<CustomerPage>;
  findById(id: string): Promise<Customer | undefined>;
  findByEmail(email: string): Promise<Customer | undefined>;
  update(id: string, input: UpdateCustomerInput): Promise<Customer | undefined>;
}

export interface CustomerRegistrationTokenRecord {
  id: string;
  customerId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  deliveryStatus: "pending" | "sent" | "failed";
  deliveryError: string | null;
  createdAt: Date;
}

export interface CustomerRegistrationTokenRepository {
  createForCustomer(customerId: string, token: string, expiresAt: Date): Promise<CustomerRegistrationTokenRecord>;
  findValidByToken(token: string): Promise<CustomerRegistrationTokenRecord | undefined>;
  markUsed(id: string): Promise<void>;
  markDelivery(id: string, status: "sent" | "failed", errorMessage?: string): Promise<void>;
}