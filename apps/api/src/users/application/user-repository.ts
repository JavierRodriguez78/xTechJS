import type { User, UserCredentials } from "../domain/user.js";

export interface UserRepository {
  findAll(): Promise<readonly User[]>;
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<UserCredentials | undefined>;
  count(): Promise<number>;
  create(user: UserCredentials): Promise<User>;
}