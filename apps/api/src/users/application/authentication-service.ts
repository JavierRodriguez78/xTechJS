import { compare, hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { User, UserCredentials } from "../domain/user.js";
import type { UserRepository } from "./user-repository.js";
import { isStaffRole } from "../../shared/domain/user-role.js";

export class OwnProfileError extends Error {
  constructor(public readonly reason: "unavailable" | "currentPassword" | "email" | "newPassword") {
    super(reason);
  }
}

export interface UpdateOwnCredentialsInput { currentPassword: string; email?: string; newPassword?: string }

@Traceable("AuthenticationService")
@Service()
export class AuthenticationService {
  constructor(@Qualifier("userRepository") private readonly userRepository: UserRepository) {}

  async bootstrapAdmin(input: { email: string; displayName: string; password: string }): Promise<User> {
    if (await this.userRepository.count()) {
      throw new Error("Bootstrap is available only when no users exist");
    }

    return this.userRepository.create({
      id: randomUUID(),
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      passwordHash: await hash(input.password, 12),
      role: "admin",
      storeId: null,
      active: true
    });
  }

  async authenticate(email: string, password: string): Promise<UserCredentials | undefined> {
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user || !user.active || !(await compare(password, user.passwordHash))) {
      return undefined;
    }
    return user;
  }

  async findActiveNonAdminUser(id: string): Promise<User | undefined> {
    const user = await this.userRepository.findById(id);
    return user?.active && user.role !== "admin" ? user : undefined;
  }

  async findOwnStaffProfile(id: string): Promise<User | undefined> {
    const user = await this.userRepository.findById(id);
    if (!user?.active || !isStaffRole(user.role)) return undefined;
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role, storeId: user.storeId, active: user.active };
  }

  async updateOwnCredentials(id: string, input: UpdateOwnCredentialsInput): Promise<User> {
    const profile = await this.findOwnStaffProfile(id);
    if (!profile) throw new OwnProfileError("unavailable");
    const credentials = await this.userRepository.findByEmail(profile.email);
    if (!credentials || credentials.id !== id || !credentials.active || !isStaffRole(credentials.role)) throw new OwnProfileError("unavailable");
    if (!await compare(input.currentPassword, credentials.passwordHash)) throw new OwnProfileError("currentPassword");
    const update: { email?: string; passwordHash?: string } = {};
    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      const existing = await this.userRepository.findByEmail(email);
      if (existing && existing.id !== id) throw new OwnProfileError("email");
      update.email = email;
    }
    if (input.newPassword !== undefined) {
      if (input.newPassword.length < 12 || Buffer.byteLength(input.newPassword, "utf8") > 72) throw new OwnProfileError("newPassword");
      update.passwordHash = await hash(input.newPassword, 12);
    }
    const user = await this.userRepository.update(id, update);
    if (!user) throw new OwnProfileError("unavailable");
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role, storeId: user.storeId, active: user.active };
  }
}