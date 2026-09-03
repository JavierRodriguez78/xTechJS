import type { User } from "../domain/user.js";

export interface UserRepository {
  findAll(): Promise<readonly User[]>;
  findById(id: string): Promise<User | undefined>;
}