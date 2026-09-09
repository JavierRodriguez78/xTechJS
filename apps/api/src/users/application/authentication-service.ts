import { compare, hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { User, UserCredentials } from "../domain/user.js";
import type { UserRepository } from "./user-repository.js";

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
}