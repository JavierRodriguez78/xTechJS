export function chatRoomName(repairOrderId: string): string {
  return `repair:${repairOrderId}`;
}

// Broad rooms used only to push lightweight "you have a new message somewhere" notifications,
// so staff/customers can be notified without joining every repair room individually.
export function staffNotificationRoom(): string {
  return "chat:staff";
}

export function customerNotificationRoom(customerId: string): string {
  return `chat:customer:${customerId}`;
}
