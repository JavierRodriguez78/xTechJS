import type { User } from "../domain/user.js";
import type { UserRepository } from "./user-repository.js";

export class ListUsers {
  constructor(private readonly userRepository: UserRepository) {}

  execute(): Promise<readonly User[]> {
    return this.userRepository.findAll();
  }
}