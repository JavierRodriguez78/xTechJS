import { Qualifier, Service } from "@xtaskjs/core";
import type { User } from "../domain/user.js";
import type { UserRepository } from "./user-repository.js";

@Service()
export class ListUsers {
  constructor(@Qualifier("userRepository") private readonly userRepository: UserRepository) {}

  execute(): Promise<readonly User[]> {
    return this.userRepository.findAll();
  }
}