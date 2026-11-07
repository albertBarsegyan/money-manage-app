import { z } from "zod";
import { parseMoney } from "@/entities/finance";

export const transactionSchema = z
  .object({
    type: z.enum(["EXPENSE", "INCOME", "REFUND", "TRANSFER"]),
    budgetMode: z.enum(["DAILY", "GLOBAL"]),
    description: z.string().trim(),
    amount: z.string().trim().min(1, "Enter an amount."),
    currency: z.enum(["AMD", "USD", "EUR", "GBP"]),
    category: z.string().trim().min(1, "Choose a category."),
    accountId: z.string(),
    destinationAccountId: z.string(),
    occurredAt: z.string().min(1, "Choose a date and time."),
    status: z.enum(["CONFIRMED", "PENDING", "CANCELLED"]),
    notes: z.string(),
  })
  .superRefine((value, context) => {
    if (!parseMoney(value.amount, value.currency))
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Enter a valid positive amount.",
      });
    if (!Number.isFinite(Date.parse(value.occurredAt)))
      context.addIssue({
        code: "custom",
        path: ["occurredAt"],
        message: "Choose a valid date and time.",
      });
    if (value.type === "TRANSFER") {
      if (!value.accountId)
        context.addIssue({
          code: "custom",
          path: ["accountId"],
          message: "Choose the account to transfer from.",
        });
      if (!value.destinationAccountId)
        context.addIssue({
          code: "custom",
          path: ["destinationAccountId"],
          message: "Choose the account to transfer to.",
        });
      if (value.accountId && value.accountId === value.destinationAccountId)
        context.addIssue({
          code: "custom",
          path: ["destinationAccountId"],
          message: "Choose a different destination account.",
        });
    }
  });

export type TransactionFormValues = z.infer<typeof transactionSchema>;
