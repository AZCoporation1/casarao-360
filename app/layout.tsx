import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Central Casarão 360",
  description: "Plataforma institucional e operacional para o restaurante e eventos O Casarão",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={cn(
          montserrat.variable,
          "font-sans antialiased min-h-screen flex flex-col"
        )}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
