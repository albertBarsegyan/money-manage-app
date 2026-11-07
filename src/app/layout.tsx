import type { Metadata } from "next";
import "./styles/globals.css";
import { AppProviders } from "./providers/index";

export const metadata: Metadata = {
  title: "Finora — Money, made clearer",
  description: "A calmer way to track your income, spending, and financial accounts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
