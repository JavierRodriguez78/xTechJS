import type { Socket } from "socket.io";
import { Service } from "@xtaskjs/core";
import { OnSocketConnection, OnSocketEvent, SocketGateway, type SocketHandlerContext } from "@xtaskjs/socket-io";
import type { CustomerRepository } from "../../../customers/application/customer-repository.js";
import type { RepairOrderRepository } from "../../../repairs/application/repair-order-repository.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { hasPermission } from "../../../users/domain/permission.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";
import { chatRoomName, customerNotificationRoom, staffNotificationRoom } from "./chat-room.js";
import { verifySocketToken } from "./socket-auth.js";

interface AuthenticatedSocketData {
  user?: AuthTokenPayload;
}

function extractToken(socket: Socket): string | undefined {
  const auth = socket.handshake.auth as { token?: string } | undefined;
  if (auth?.token) return auth.token;
  const header = socket.handshake.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
}

// This gateway must not declare any @AutoWired/@Qualifier/@InjectDataSource property or
// constructor dependency: @xtaskjs/socket-io's discoverGateways() constructs every @SocketGateway
// synchronously while wiring the HTTP server, before the TypeORM datasource component exists.
// Any dependency resolved at construction time (property or constructor, it makes no difference —
// injectAutoWiredFields always runs eagerly right after `new`) crashes the boot. Repositories are
// instead pulled on demand from the per-event `context.container`, which only happens once a real
// client connects — long after the datasource is ready. See 09-hallazgos-tecnicos for the full story.
@Service()
@SocketGateway({ namespace: "/chat", group: ["chat"] })
export class ChatGateway {
  @OnSocketConnection()
  async onConnect(socket: Socket, context: SocketHandlerContext): Promise<void> {
    const user = verifySocketToken(extractToken(socket));
    if (!user || !hasPermission(user.role, PERMISSIONS.chatUse)) {
      socket.disconnect(true);
      return;
    }
    (socket.data as AuthenticatedSocketData).user = user;
    if (user.role === "customer") {
      const customer = await this.customerRepository(context).findByEmail(user.email ?? "");
      if (customer) await socket.join(customerNotificationRoom(customer.id));
    } else {
      await socket.join(staffNotificationRoom());
    }
  }

  @OnSocketEvent("chat.join")
  async onJoin(payload: { repairOrderId?: string }, context: SocketHandlerContext): Promise<{ ok: boolean; error?: string }> {
    const repairOrderId = payload?.repairOrderId;
    const user = (context.socket.data as AuthenticatedSocketData).user;
    if (!user || !repairOrderId) return { ok: false, error: "unauthorized" };
    if (!(await this.canAccessRepair(user, repairOrderId, context))) return { ok: false, error: "forbidden" };
    await context.socket.join(chatRoomName(repairOrderId));
    return { ok: true };
  }

  @OnSocketEvent("chat.leave")
  onLeave(payload: { repairOrderId?: string }, context: SocketHandlerContext): void {
    if (payload?.repairOrderId) void context.socket.leave(chatRoomName(payload.repairOrderId));
  }

  private async canAccessRepair(user: AuthTokenPayload, repairOrderId: string, context: SocketHandlerContext): Promise<boolean> {
    const repair = await this.repairOrderRepository(context).findById(repairOrderId);
    if (!repair) return false;
    if (user.role !== "customer") return true;
    const customer = await this.customerRepository(context).findByEmail(user.email ?? "");
    return !!customer && repair.customerId === customer.id;
  }

  private customerRepository(context: SocketHandlerContext): CustomerRepository {
    return context.container!.getByName<CustomerRepository>("customerRepository");
  }

  private repairOrderRepository(context: SocketHandlerContext): RepairOrderRepository {
    return context.container!.getByName<RepairOrderRepository>("repairOrderRepository");
  }
}
