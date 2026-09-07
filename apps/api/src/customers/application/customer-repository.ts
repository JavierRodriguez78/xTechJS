import type { CreateCustomerInput, Customer, UpdateCustomerInput } from "../domain/customer.js";

export interface NewCustomerRecord extends CreateCustomerInput {
  id: string;
}

export interface CustomerRepository {
  create(input: NewCustomerRecord): Promise<Customer>;
  findAll(): Promise<readonly Customer[]>;
  findById(id: string): Promise<Customer | undefined>;
  update(id: string, input: UpdateCustomerInput): Promise<Customer | undefined>;
}