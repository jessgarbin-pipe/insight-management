import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/sonner";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { OrgProvider } from "@/components/providers/OrgProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Insight Manager",
  description:
    "AI-powered insight management platform for product teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OrgProvider>
            <RealtimeProvider>
              <Header />
              <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
                {children}
              </main>
              <Toaster />
            </RealtimeProvider>
          </OrgProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
