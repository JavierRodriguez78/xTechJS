import { z } from "zod";
import { AdminEmailVO } from "../value-objects/admin-email-vo.js";
import { DisplayNameVO } from "../value-objects/display-name-vo.js";
const registerAdminSchema = z.object({
  email: z.string().trim().email().max(320).transform((value, ctx) => {
      try {
        return new AdminEmailVO(value);
      } catch (error) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: (error as Error).message });
        return z.NEVER;
      }
    }),
  displayName: z.string().trim().min(1).max(160).transform((value, ctx) => {
      try {
        return new DisplayNameVO(value);
      } catch (error) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: (error as Error).message });
        return z.NEVER;
      }
    }),
  password: z.string().min(12).max(256)
});

type RegisterAdminBody = z.infer<typeof registerAdminSchema>;
export { registerAdminSchema, RegisterAdminBody };
