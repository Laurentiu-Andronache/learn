import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { Footer } from "@/components/footer";
import { NavBar } from "@/components/nav-bar";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <AnalyticsProvider />
        <NextIntlClientProvider locale={locale} messages={messages}>
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
