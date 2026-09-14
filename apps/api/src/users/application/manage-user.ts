import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { User, UserCredentials } from "../domain/user.js";
import type { UserRepository } from "./user-repository.js";

@Traceable("ManageUser")
@Service()
export class ManageUser {
  constructor(@Qualifier("userRepository") private readonly userRepository: UserRepository) {}

  async create(input: { email: string; displayName: string; role: User["role"]; password: string }): Promise<User> {
    const email = input.email.trim().toLowerCase();
    if (input.password.length < 12) throw new Error("Password must have at least 12 characters");
    if (await this.userRepository.findByEmail(email)) throw new Error("User email already exists");
    const user: UserCredentials = { id: randomUUID(), email, displayName: input.displayName.trim(), role: input.role, active: true, passwordHash: await hash(input.password, 12) };
    return this.userRepository.create(user);
  }

  async update(id: string, input: { email?: string; displayName?: string; role?: User["role"]; active?: boolean; password?: string }): Promise<User | undefined> {
    const current = await this.userRepository.findById(id);
    if (!current) return undefined;
    const update: Parameters<UserRepository["update"]>[1] = { email: input.email?.trim().toLowerCase(), displayName: input.displayName?.trim(), role: input.role, active: input.active };
    if (input.password) {
      if (input.password.length < 12) throw new Error("Password must have at least 12 characters");
      update.passwordHash = await hash(input.password, 12);
    }
    return this.userRepository.update(id, update);
  }
}