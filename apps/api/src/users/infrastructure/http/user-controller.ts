import { Controller, Get, UseGuards } from "@xtaskjs/common";
import { InjectQueryBus, type QueryBus } from "@xtaskjs/cqrs";
import { ListTechniciansQuery, ListUsersQuery } from "../../application/cqrs/user-messages.js";
import { PERMISSIONS } from "../../domain/permission.js";
import { requireControllerPermission } from "./auth-routes.js";

@Controller("/api")
export class UserController {
  constructor(@InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get("/users")
  @UseGuards(requireControllerPermission(PERMISSIONS.usersManage))
  listUsers(): Promise<unknown> {
    return this.queryBus.execute(new ListUsersQuery());
  }

  @Get("/technicians")
  @UseGuards(requireControllerPermission(PERMISSIONS.repairsManage))
  listTechnicians(): Promise<unknown> {
    return this.queryBus.execute(new ListTechniciansQuery());
  }
}