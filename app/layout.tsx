import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { Footer } from "@/components/footer";
import { NavBar } from "@/components/nav-bar";
import { StructuredData } from "@/components/seo/structured-data";
import { Toaster } from "@/components/ui/sonner";
import { generateBaseMetadata, getBaseUrl } from "@/lib/seo/metadata-utils";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return generateBaseMetadata(getBaseUrl(), locale);
}

const geistSans = Geist({
  variable: "--font-body",
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
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <StructuredData baseUrl={getBaseUrl()} locale={locale} />
        <AnalyticsProvider />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-screen flex flex-col">
              <NavBar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <FeedbackButton />
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
