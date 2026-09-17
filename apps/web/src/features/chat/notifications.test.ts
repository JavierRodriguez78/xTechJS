import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatNotification } from "./notifications";

const handlers = new Map<string, (payload: ChatNotification) => void>();
const socket = {
  on: vi.fn((event: string, handler: (payload: ChatNotification) => void) => { handlers.set(event, handler); }),
  off: vi.fn((event: string) => { handlers.delete(event); })
};

vi.mock("./socket", () => ({ getChatSocket: () => socket }));

async function loadNotifications() {
  vi.resetModules();
  handlers.clear();
  socket.on.mockClear();
  socket.off.mockClear();
  return import("./notifications");
}

function notification(overrides: Partial<ChatNotification> = {}): ChatNotification {
  return {
    repairOrderId: "repair-1",
    senderId: "customer-1",
    senderName: "Cliente",
    senderRole: "customer",
    preview: "Hola, como va la reparacion?",
    createdAt: "2026-09-17T10:00:00.000Z",
    ...overrides
  };
}

function emit(payload: ChatNotification): void {
  handlers.get("chat.notification")?.(payload);
}

describe("notificaciones de chat", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.resetModules(); });

  it("acumula los no leidos por reparacion", async () => {
    const { startChatNotifications, chatUnreadByRepair, totalChatUnread } = await loadNotifications();
    startChatNotifications("token-staff", "technician-1");

    emit(notification());
    emit(notification());
    emit(notification({ repairOrderId: "repair-2" }));

    expect(chatUnreadByRepair["repair-1"]).toBe(2);
    expect(chatUnreadByRepair["repair-2"]).toBe(1);
    expect(totalChatUnread()).toBe(3);
  });

  it("ignora los mensajes propios para no notificarse a uno mismo", async () => {
    const { startChatNotifications, chatUnreadByRepair, chatToasts } = await loadNotifications();
    startChatNotifications("token-staff", "technician-1");

    emit(notification({ senderId: "technician-1", senderRole: "technician" }));

    expect(chatUnreadByRepair["repair-1"]).toBeUndefined();
    expect(chatToasts).toHaveLength(0);
  });

  it("descarta el toast automaticamente sin perder el contador de no leidos", async () => {
    const { startChatNotifications, chatToasts, chatUnreadByRepair } = await loadNotifications();
    startChatNotifications("token-staff", "technician-1");

    emit(notification());
    expect(chatToasts).toHaveLength(1);

    vi.advanceTimersByTime(6000);

    expect(chatToasts).toHaveLength(0);
    expect(chatUnreadByRepair["repair-1"]).toBe(1);
  });

  it("genera identificadores de toast distintos para mensajes simultaneos", async () => {
    const { startChatNotifications, chatToasts } = await loadNotifications();
    startChatNotifications("token-staff", "technician-1");

    emit(notification());
    emit(notification());

    expect(new Set(chatToasts.map((toast) => toast.id)).size).toBe(2);
  });

  it("descarta un toast concreto por identificador", async () => {
    const { startChatNotifications, chatToasts, dismissToast } = await loadNotifications();
    startChatNotifications("token-staff", "technician-1");

    emit(notification());
    emit(notification({ repairOrderId: "repair-2" }));
    dismissToast(chatToasts[0].id);

    expect(chatToasts.map((toast) => toast.repairOrderId)).toEqual(["repair-2"]);
  });

  it("marca como leida solo la reparacion abierta", async () => {
    const { startChatNotifications, chatUnreadByRepair, markRepairRead } = await loadNotifications();
    startChatNotifications("token-staff", "technician-1");

    emit(notification());
    emit(notification({ repairOrderId: "repair-2" }));
    markRepairRead("repair-1");

    expect(chatUnreadByRepair["repair-1"]).toBeUndefined();
    expect(chatUnreadByRepair["repair-2"]).toBe(1);
  });

  it("no duplica la suscripcion cuando se reinicia con el mismo token", async () => {
    const { startChatNotifications, chatUnreadByRepair } = await loadNotifications();
    startChatNotifications("token-staff", "technician-1");
    startChatNotifications("token-staff", "technician-1");

    emit(notification());

    expect(socket.on).toHaveBeenCalledOnce();
    expect(chatUnreadByRepair["repair-1"]).toBe(1);
  });

  it("limpia contadores y toasts al cerrar sesion", async () => {
    const { startChatNotifications, stopChatNotifications, chatToasts, chatUnreadByRepair, totalChatUnread } = await loadNotifications();
    startChatNotifications("token-staff", "technician-1");

    emit(notification());
    stopChatNotifications();

    expect(chatToasts).toHaveLength(0);
    expect(Object.keys(chatUnreadByRepair)).toHaveLength(0);
    expect(totalChatUnread()).toBe(0);
  });
});
