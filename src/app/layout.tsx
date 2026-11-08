import type { Metadata } from "next";
import type { Viewport } from "next";
import "./styles/globals.css";
import { AppProviders } from "./providers/index";

export const metadata: Metadata = {
  title: "Finora — Money, made clearer",
  description: "A calmer way to track your income, spending, and financial accounts.",
  applicationName: "Finora",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finora",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6b5ce7",
  colorScheme: "light dark",
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
