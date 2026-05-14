import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CoraFit",
  description: "Professional coaching operations for fitness teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={sora.variable}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
