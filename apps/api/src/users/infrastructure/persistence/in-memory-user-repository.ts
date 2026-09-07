import type { UserRepository } from "../../application/user-repository.js";
import type { User, UserCredentials } from "../../domain/user.js";

const users: UserCredentials[] = [
  { id: "admin-1", email: "admin@xtechjs.local", displayName: "Admin Taller", role: "admin", active: true, passwordHash: "test-only" },
  { id: "technician-1", email: "tecnico@xtechjs.local", displayName: "Ana Tecnica", role: "technician", active: true, passwordHash: "test-only" },
  { id: "customer-1", email: "cliente@xtechjs.local", displayName: "Marta Ruiz", role: "customer", active: true, passwordHash: "test-only" }
];

export class InMemoryUserRepository implements UserRepository {
  async findAll(): Promise<readonly User[]> {
    return users;
  }

  async findById(id: string): Promise<User | undefined> {
    return users.find((user) => user.id === id);
  }

  async findActiveByRole(role: User["role"]): Promise<readonly User[]> {
    return users.filter((user) => user.role === role && user.active);
  }

  async findByEmail(email: string): Promise<UserCredentials | undefined> {
    return users.find((user) => user.email === email);
  }

  async count(): Promise<number> {
    return users.length;
  }

  async create(user: UserCredentials): Promise<User> {
    users.push(user);
    return user;
  }
}