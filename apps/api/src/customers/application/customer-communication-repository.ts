import type { CustomerCommunication } from "../domain/customer-communication.js";

export interface CustomerCommunicationRepository {
  findByCustomerId(customerId: string): Promise<readonly CustomerCommunication[]>;
}