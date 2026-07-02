import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "../components/layout/site-header";

export const metadata: Metadata = {
  title: "Inside Platform",
  description: "Role-based event ticket and QR authentication platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}