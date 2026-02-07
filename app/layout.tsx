import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "LEARN - Bilingual Study App",
  description:
    "Master any topic with science-backed spaced repetition. Bilingual quiz and flashcard app.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <AnalyticsProvider />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen flex flex-col">
            <NavBar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <FeedbackButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
