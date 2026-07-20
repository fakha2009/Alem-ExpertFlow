import type { Metadata } from "next";
import { headers } from "next/headers";
import "@/app/globals.css";
import { APP_NAME } from "@/lib/constants";
import { getCurrentLocale } from "@/server/i18n";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Internal expert assignment workflow for requests, experts and analytics."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, requestHeaders] = await Promise.all([getCurrentLocale(), headers()]);
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('aef-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}"
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
