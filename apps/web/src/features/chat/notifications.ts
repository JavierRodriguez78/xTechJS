import { reactive } from "vue";
import { getChatSocket } from "./socket";

export interface ChatNotification {
  repairOrderId: string;
  senderId: string;
  senderName: string;
  senderRole: "admin" | "technician" | "customer";
  preview: string;
  createdAt: string;
}

const unreadByRepair = reactive<Record<string, number>>({});
const recentToasts = reactive<(ChatNotification & { id: string })[]>([]);
let currentToken: string | undefined;
let currentUserId: string | undefined;

function onNotification(payload: ChatNotification): void {
  if (payload.senderId === currentUserId) return;
  unreadByRepair[payload.repairOrderId] = (unreadByRepair[payload.repairOrderId] ?? 0) + 1;
  const toastId = `${payload.repairOrderId}-${payload.createdAt}-${Math.random().toString(36).slice(2)}`;
  recentToasts.push({ ...payload, id: toastId });
  window.setTimeout(() => {
    const index = recentToasts.findIndex((toast) => toast.id === toastId);
    if (index !== -1) recentToasts.splice(index, 1);
  }, 6000);
}

export function startChatNotifications(token: string, userId: string): void {
  if (currentToken === token) return;
  currentToken = token;
  currentUserId = userId;
  const socket = getChatSocket(token);
  socket.off("chat.notification", onNotification);
  socket.on("chat.notification", onNotification);
}

export function stopChatNotifications(): void {
  currentToken = undefined;
  currentUserId = undefined;
  recentToasts.splice(0, recentToasts.length);
  Object.keys(unreadByRepair).forEach((key) => delete unreadByRepair[key]);
}

export function markRepairRead(repairOrderId: string): void {
  delete unreadByRepair[repairOrderId];
}

export function dismissToast(id: string): void {
  const index = recentToasts.findIndex((toast) => toast.id === id);
  if (index !== -1) recentToasts.splice(index, 1);
}

export const chatUnreadByRepair = unreadByRepair;
export const chatToasts = recentToasts;
export const totalChatUnread = () => Object.values(unreadByRepair).reduce((sum, count) => sum + count, 0);
