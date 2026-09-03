import type { UserRepository } from "../../application/user-repository.js";
import type { User } from "../../domain/user.js";

const users: readonly User[] = [
  { id: "admin-1", email: "admin@xtechjs.local", displayName: "Admin Taller", role: "admin", active: true },
  { id: "technician-1", email: "tecnico@xtechjs.local", displayName: "Ana Tecnica", role: "technician", active: true },
  { id: "customer-1", email: "cliente@xtechjs.local", displayName: "Marta Ruiz", role: "customer", active: true }
];

export class InMemoryUserRepository implements UserRepository {
  async findAll(): Promise<readonly User[]> {
    return users;
  }

  async findById(id: string): Promise<User | undefined> {
    return users.find((user) => user.id === id);
  }
}