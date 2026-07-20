import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/forms/login-form";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { APP_NAME } from "@/lib/constants";
import { getSessionUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [user, i18n] = await Promise.all([getSessionUser(), getCurrentI18n()]);
  const t = i18n.dictionary;

  if (user) redirect("/dashboard");

  return (
    <I18nProvider locale={i18n.locale} dictionary={t}>
      <main className="grid min-h-[100svh] bg-background lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
      <section className="hidden border-r bg-surface/95 px-10 py-10 shadow-sm lg:flex lg:flex-col lg:justify-between xl:px-14">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          {APP_NAME}
        </div>
        <div className="max-w-2xl py-12">
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-foreground xl:text-5xl">
            {t.auth.heroTitle}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            {t.auth.heroText}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="min-h-24 rounded-lg border bg-background/80 p-4 shadow-sm">
            <div className="font-semibold">RBAC</div>
            <div className="mt-1 text-muted-foreground">{t.auth.serverRoles}</div>
          </div>
          <div className="min-h-24 rounded-lg border bg-background/80 p-4 shadow-sm">
            <div className="font-semibold">Scoring</div>
            <div className="mt-1 text-muted-foreground">{t.auth.scoring}</div>
          </div>
          <div className="min-h-24 rounded-lg border bg-background/80 p-4 shadow-sm">
            <div className="font-semibold">Audit</div>
            <div className="mt-1 text-muted-foreground">{t.auth.audit}</div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-5 py-8 sm:px-8">
        <div className="min-w-0 w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:hidden">
            <div className="flex min-w-0 items-center gap-3 text-lg font-semibold">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="truncate">{APP_NAME}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <ThemeToggle label={t.common.toggleTheme} />
              <LanguageSwitcher locale={i18n.locale} label={t.common.language} className="min-w-0 flex-1 sm:w-36 sm:flex-none" />
            </div>
          </div>
          <div className="rounded-lg border bg-surface p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{t.auth.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t.auth.help}</p>
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                <ThemeToggle label={t.common.toggleTheme} />
                <LanguageSwitcher locale={i18n.locale} label={t.common.language} />
              </div>
            </div>
            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            {t.auth.workspaceNotice}
          </p>
        </div>
      </section>
      </main>
    </I18nProvider>
  );
}
