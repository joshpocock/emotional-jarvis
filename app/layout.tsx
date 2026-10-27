import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import VoiceBadge from "@/components/VoiceBadge";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jarvis",
  description: "A voice assistant for your business that picks its own tone. Fish Audio Drama 3 + Claude.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <VoiceBadge />
        {children}
      </body>
    </html>
  );
}
