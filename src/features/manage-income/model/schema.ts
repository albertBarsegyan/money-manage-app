import { z } from "zod";
import { isIsoDate, parseMoney } from "@/entities/finance";

export const incomeSchema = z
  .object({
    source: z.enum(["SALARY", "FREELANCE", "BUSINESS", "BONUS", "OTHER"]),
    description: z.string().trim(),
    amount: z.string().trim().min(1, "Enter an amount."),
    currency: z.enum(["AMD", "USD", "EUR", "GBP"]),
    receivedOn: z.string(),
    expectedOn: z.string(),
    recurrence: z.enum(["", "ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
    salaryPeriodId: z.string(),
    accountId: z.string(),
    status: z.enum(["EXPECTED", "RECEIVED", "CANCELLED"]),
  })
  .superRefine((value, context) => {
    const amount = parseMoney(value.amount, value.currency);
    if (!amount)
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Enter a valid positive amount.",
      });
    if (value.receivedOn && !isIsoDate(value.receivedOn))
      context.addIssue({
        code: "custom",
        path: ["receivedOn"],
        message: "Choose a valid received date.",
      });
    if (value.expectedOn && !isIsoDate(value.expectedOn))
      context.addIssue({
        code: "custom",
        path: ["expectedOn"],
        message: "Choose a valid expected date.",
      });
    if (value.status === "RECEIVED" && !value.receivedOn)
      context.addIssue({
        code: "custom",
        path: ["receivedOn"],
        message: "Add the date the income arrived.",
      });
  });

export type IncomeFormValues = z.infer<typeof incomeSchema>;
