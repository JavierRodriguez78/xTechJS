import { Controller, Get } from "@xtaskjs/common";
import { InjectQueryBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { ListTechniciansQuery, ListUsersQuery } from "../../application/cqrs/user-messages.js";
import { PERMISSIONS } from "../../domain/permission.js";
import { PermissionRequired } from "./permission-guard.js";

@Authenticated()
@Controller("/api")
export class UserController {
  constructor(@InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get("/users")
  @PermissionRequired(PERMISSIONS.usersManage)
  listUsers(): Promise<unknown> {
    return this.queryBus.execute(new ListUsersQuery());
  }

  @Get("/technicians")
  @PermissionRequired(PERMISSIONS.repairsManage)
  listTechnicians(): Promise<unknown> {
    return this.queryBus.execute(new ListTechniciansQuery());
  }
}