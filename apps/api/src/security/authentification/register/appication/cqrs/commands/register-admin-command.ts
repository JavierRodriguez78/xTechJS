import { AdminEmailVO } from "../../../domain/value-objects/admin-email-vo.js";
import { DisplayNameVO } from "../../../domain/value-objects/display-name-vo.js";

export class RegisterAdminCommand {
  constructor(public readonly input: { email:AdminEmailVO ; displayName: DisplayNameVO; password: string })
   {}
}