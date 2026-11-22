import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: {
    default: "punchface — invites people actually answer",
    template: "%s · punchface",
  },
  description:
    "Free, ad-free party invitations. Share one link, guests reply in a tap with no account, and you see who’s coming.",
  applicationName: "punchface",
  openGraph: {
    type: "website",
    siteName: "punchface",
    title: "punchface — invites people actually answer",
    description: "Free, ad-free party invitations with one-tap RSVPs.",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff6ea" },
    { media: "(prefers-color-scheme: dark)", color: "#15101d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="btn btn-ink sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
