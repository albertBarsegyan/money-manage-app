import { z } from "zod";
import { parseMoney } from "@/entities/finance";

export const accountSchema = z
  .object({
    name: z.string().trim().min(1, "Enter an account name."),
    type: z.enum(["CASH", "CHECKING", "SAVINGS", "CREDIT", "OTHER"]),
    currency: z.enum(["AMD", "USD", "EUR", "GBP"]),
    balance: z.string(),
  })
  .superRefine((value, context) => {
    if (parseMoney(value.balance || "0", value.currency) === null) {
      context.addIssue({
        code: "custom",
        path: ["balance"],
        message: "Enter a valid opening balance.",
      });
    }
  });

export type AccountFormValues = z.infer<typeof accountSchema>;
