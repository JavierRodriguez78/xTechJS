export type CustomerCommunicationType = "registration_invitation" | "invoice_email" | "repair_notification";
export type CustomerCommunicationStatus = "pending" | "sent" | "failed";

export interface CustomerCommunication {
  id: string;
  type: CustomerCommunicationType;
  recipient: string;
  status: CustomerCommunicationStatus;
  subject: string;
  reference: string | null;
  errorMessage: string | null;
  createdAt: Date;
}