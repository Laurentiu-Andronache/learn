import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
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

  const cookieStore = await cookies();
  const bfs = parseInt(cookieStore.get("base_font_size")?.value || "14", 10);
  const htmlStyle =
    bfs !== 14
      ? ({ "--text-sm": `${bfs / 16}rem` } as React.CSSProperties)
      : undefined;

  return (
    <html lang={locale} suppressHydrationWarning style={htmlStyle}>
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
              <main className="flex-1 flex flex-col">{children}</main>
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
