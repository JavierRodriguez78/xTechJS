export type CustomerNotificationStatus = "pending" | "sent" | "failed";

export interface CustomerNotificationRecord {
  id: string;
  customerId: string;
  repairOrderId: string | null;
  templateKey: string;
  recipient: string;
  subject: string;
  status: CustomerNotificationStatus;
  errorMessage: string | null;
  createdAt: Date;
}

export interface CustomerNotificationRepository {
  record(input: Omit<CustomerNotificationRecord, "id" | "createdAt" | "errorMessage"> & { errorMessage?: string | null }): Promise<CustomerNotificationRecord>;
  markDelivery(id: string, status: CustomerNotificationStatus, errorMessage?: string): Promise<void>;
}
