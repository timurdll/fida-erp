import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIDA ERP",
  description: "Система управления отгрузками бетона",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark h-full antialiased">
      <body className="bg-background text-foreground min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
