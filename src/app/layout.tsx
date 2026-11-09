import type { Metadata } from "next";
import type { Viewport } from "next";
import "./styles/globals.css";
import { AppProviders } from "./providers/index";

export const metadata: Metadata = {
  title: "Finora — Money, made clearer",
  description: "A calmer way to track your income, spending, and financial accounts.",
  applicationName: "Finora",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finora",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#6b5ce7",
  colorScheme: "light dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
