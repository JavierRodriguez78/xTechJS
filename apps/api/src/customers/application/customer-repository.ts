import type { CreateCustomerInput, Customer, UpdateCustomerInput } from "../domain/customer.js";

export interface NewCustomerRecord extends CreateCustomerInput {
  id: string;
}

export interface CustomerRepository {
  create(input: NewCustomerRecord): Promise<Customer>;
  findAll(): Promise<readonly Customer[]>;
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
  createdAt: Date;
}

export interface CustomerRegistrationTokenRepository {
  createForCustomer(customerId: string, token: string, expiresAt: Date): Promise<CustomerRegistrationTokenRecord>;
  findValidByToken(token: string): Promise<CustomerRegistrationTokenRecord | undefined>;
  markUsed(id: string): Promise<void>;
}