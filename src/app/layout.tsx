import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

export const metadata: Metadata = {
  title: "Recuter - IT Nearshore Recruitment CRM",
  description: "Almanya IT sektoru icin nearshore recruitment CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-gray-50 antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
