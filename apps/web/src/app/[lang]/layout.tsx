import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import {
  Geist,
  Geist_Mono,
  Noto_Nastaliq_Urdu,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { I18nProvider } from "@/i18n/client";
import { isLocale, LOCALES, localeInfo } from "@/i18n/locales";
import { getDictionary } from "@/i18n/server";
import { site } from "@/lib/site";
import "../globals.css";

// next/font self-hosts the fonts at build time: no request to Google from the user's browser.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// One Noto font per Indian script. preload: false + unicode-range means the browser only
// downloads a script's font when text in that script is actually on the page.
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "600", "700"], preload: false });
const gujr = Noto_Sans_Gujarati({ variable: "--font-gujr", subsets: ["gujarati"], weight: ["400", "600", "700"], preload: false });
const beng = Noto_Sans_Bengali({ variable: "--font-beng", subsets: ["bengali"], weight: ["400", "600", "700"], preload: false });
const taml = Noto_Sans_Tamil({ variable: "--font-taml", subsets: ["tamil"], weight: ["400", "600", "700"], preload: false });
const telu = Noto_Sans_Telugu({ variable: "--font-telu", subsets: ["telugu"], weight: ["400", "600", "700"], preload: false });
const knda = Noto_Sans_Kannada({ variable: "--font-knda", subsets: ["kannada"], weight: ["400", "600", "700"], preload: false });
const mlym = Noto_Sans_Malayalam({ variable: "--font-mlym", subsets: ["malayalam"], weight: ["400", "600", "700"], preload: false });
const guru = Noto_Sans_Gurmukhi({ variable: "--font-guru", subsets: ["gurmukhi"], weight: ["400", "600", "700"], preload: false });
const orya = Noto_Sans_Oriya({ variable: "--font-orya", subsets: ["oriya"], weight: ["400", "600", "700"], preload: false });
const arab = Noto_Nastaliq_Urdu({ variable: "--font-arab", subsets: ["arabic"], weight: ["400", "700"], preload: false });
const indic = [deva, gujr, beng, taml, telu, knda, mlym, guru, orya, arab];

// Every language is prerendered at build time (required with Cache Components).
export function generateStaticParams() {
  return LOCALES.map((l) => ({ lang: l.code }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const t = await getDictionary(isLocale(lang) ? lang : "en");
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.name}: ${t.meta.tagline}`, template: `%s · ${site.name}` },
    description: t.meta.description,
    openGraph: { type: "website", siteName: site.name, locale: isLocale(lang) ? localeInfo(lang).bcp47.replace("-", "_") : "en_IN" },
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l.bcp47, l.code === "en" ? "/" : `/${l.code}`])),
    },
    // Google Search Console ownership check (also needed for Google sign-in brand verification).
    // Set GOOGLE_SITE_VERIFICATION to the "content" value of Google's HTML tag.
    verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#101114" },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const info = localeInfo(lang);
  const t = await getDictionary(lang);
  const fonts = [geistSans.variable, geistMono.variable, ...indic.map((f) => f.variable)].join(" ");

  return (
    // suppressHydrationWarning: next-themes sets class="dark" before React hydrates.
    <html lang={info.bcp47} dir={info.dir} suppressHydrationWarning className={fonts}>
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider>
          <I18nProvider t={t} lang={lang}>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">
              {t.nav.skip}
            </a>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
