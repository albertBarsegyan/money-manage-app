import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/transactions")({
  validateSearch: z.object({ q: z.string().max(120).optional().default("") }),
});
