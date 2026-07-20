import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, i18n] = await Promise.all([requireUser(), getCurrentI18n()]);
  return (
    <AppShell user={user} locale={i18n.locale} dictionary={i18n.dictionary}>
      {children}
    </AppShell>
  );
}
