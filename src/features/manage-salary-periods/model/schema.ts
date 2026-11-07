import { z } from "zod";
import { isIsoDate, parseMoney } from "@/entities/finance";

export const salaryPeriodSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name for this period."),
    currency: z.enum(["AMD", "USD", "EUR", "GBP"]),
    startsOn: z.string().min(1, "Choose when this period starts."),
    nextSalaryOn: z.string().min(1, "Choose your next salary date."),
    salary: z.string(),
    recurrence: z.enum(["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  })
  .superRefine((value, context) => {
    if (!isIsoDate(value.startsOn))
      context.addIssue({
        code: "custom",
        path: ["startsOn"],
        message: "Choose a valid start date.",
      });
    if (!isIsoDate(value.nextSalaryOn))
      context.addIssue({
        code: "custom",
        path: ["nextSalaryOn"],
        message: "Choose a valid salary date.",
      });
    if (
      isIsoDate(value.startsOn) &&
      isIsoDate(value.nextSalaryOn) &&
      value.nextSalaryOn < value.startsOn
    )
      context.addIssue({
        code: "custom",
        path: ["nextSalaryOn"],
        message: "Salary date must be on or after the period start.",
      });
    if (value.salary && (parseMoney(value.salary, value.currency) ?? 0) <= 0)
      context.addIssue({
        code: "custom",
        path: ["salary"],
        message: "Enter a valid positive salary or leave this blank.",
      });
  });

export type SalaryPeriodFormValues = z.infer<typeof salaryPeriodSchema>;
