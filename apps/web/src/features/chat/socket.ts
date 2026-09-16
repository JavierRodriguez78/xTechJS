import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;
let socketToken: string | undefined;

export function getChatSocket(token: string): Socket {
  if (socket && socketToken === token) return socket;
  socket?.disconnect();
  socketToken = token;
  socket = io("/chat", { auth: { token }, transports: ["websocket", "polling"] });
  return socket;
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = undefined;
  socketToken = undefined;
}
