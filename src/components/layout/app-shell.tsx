"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { APP_NAME, type UserRole } from "@/lib/constants";
import type { AppDictionary, Locale } from "@/lib/i18n";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type { SessionUser } from "@/server/permissions/rbac";

type NavItem = {
  href: string;
  labelKey: keyof AppDictionary["common"];
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "expert", "viewer"] },
  { href: "/requests", labelKey: "requests", icon: BriefcaseBusiness, roles: ["admin", "manager", "expert", "viewer"] },
  { href: "/experts", labelKey: "experts", icon: UsersRound, roles: ["admin", "manager", "viewer"] },
  { href: "/skills", labelKey: "skills", icon: SlidersHorizontal, roles: ["admin", "manager"] },
  { href: "/analytics", labelKey: "analytics", icon: BarChart3, roles: ["admin", "manager", "viewer"] },
  { href: "/activity", labelKey: "activity", icon: Activity, roles: ["admin", "manager"] },
  { href: "/settings", labelKey: "profile", icon: Settings, roles: ["admin", "manager", "expert", "viewer"] }
];

function Breadcrumbs({ pathname, dictionary }: { pathname: string; dictionary: AppDictionary }) {
  const labels: Record<string, string> = {
    dashboard: dictionary.common.dashboard,
    requests: dictionary.common.requests,
    experts: dictionary.common.experts,
    skills: dictionary.common.skills,
    analytics: dictionary.common.analytics,
    activity: dictionary.common.activity,
    settings: dictionary.common.profile,
    new: dictionary.common.create,
    edit: dictionary.common.edit
  };
  const parts = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumbs" className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
      <Link href="/dashboard" className="transition hover:text-foreground">
        {APP_NAME}
      </Link>
      {parts.map((part, index) => {
        const href = `/${parts.slice(0, index + 1).join("/")}`;
        const isLast = index === parts.length - 1;
        return (
          <span key={href} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            {isLast ? (
              <span className="font-medium text-foreground">{labels[part] ?? dictionary.common.details}</span>
            ) : (
              <Link href={href} className="transition hover:text-foreground">
                {labels[part] ?? part}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function AppShell({
  user,
  locale,
  dictionary,
  children
}: {
  user: SessionUser;
  locale: Locale;
  dictionary: AppDictionary;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const visibleNav = useMemo(() => navItems.filter((item) => item.roles.includes(user.role)), [user.role]);

  const prefetchHref = useCallback(
    (href: string) => {
      if (href !== pathname) router.prefetch(href);
    },
    [pathname, router]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPendingHref(null), 0);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) return undefined;
    const timeoutId = window.setTimeout(() => setPendingHref(null), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [pendingHref]);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const prefetchVisibleRoutes = () => {
      visibleNav.forEach((item, index) => {
        if (item.href === pathname) return;
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) prefetchHref(item.href);
          }, index * 120)
        );
      });
    };

    const idleId =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(prefetchVisibleRoutes, { timeout: 1500 })
        : undefined;
    const fallbackId = idleId === undefined ? window.setTimeout(prefetchVisibleRoutes, 500) : undefined;

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      if (idleId !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (fallbackId !== undefined) window.clearTimeout(fallbackId);
    };
  }, [pathname, prefetchHref, visibleNav]);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function searchRequests(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    router.push(`/requests?q=${encodeURIComponent(query)}`);
    setSearch("");
  }

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, href: string, active: boolean) {
    setOpen(false);
    if (active || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    setPendingHref(href);
    prefetchHref(href);
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r bg-surface/95 shadow-sm">
      <div className="flex h-16 items-center justify-between border-b px-5">
        <Link href="/dashboard" className="focus-ring flex items-center gap-3 rounded-md font-semibold text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>{APP_NAME}</span>
        </Link>
        <button
          type="button"
          className="focus-ring rounded-md p-2 text-muted-foreground lg:hidden"
          aria-label={dictionary.common.closeMenu}
          onClick={() => setOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label={dictionary.common.mainNavigation}>
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onPointerEnter={() => prefetchHref(item.href)}
              onFocus={() => prefetchHref(item.href)}
              onClick={(event) => handleNavClick(event, item.href, active)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                pendingHref === item.href && !active ? "bg-muted text-foreground" : null
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {dictionary.common[item.labelKey]}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="rounded-md border bg-surface-elevated p-3 shadow-sm">
          <div className="truncate text-sm font-semibold text-foreground">{user.fullName}</div>
          <div className="mt-1 text-xs text-muted-foreground">{dictionary.roles.labels[user.role]}</div>
        </div>
      </div>
    </aside>
  );

  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      <div className="min-h-screen bg-background">
        <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
        {open ? (
          <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)}>
            <div className="h-full" onClick={(event) => event.stopPropagation()}>
              {sidebar}
            </div>
          </div>
        ) : null}
        <div className="lg:pl-72">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/90 px-4 shadow-sm backdrop-blur sm:gap-3 sm:px-6">
            {pendingHref ? <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-primary" /> : null}
            <button
              type="button"
              className="focus-ring rounded-md border bg-surface p-2 text-muted-foreground lg:hidden"
              aria-label={dictionary.common.openMenu}
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <Breadcrumbs pathname={pathname} dictionary={dictionary} />
            </div>
            <form
              onSubmit={searchRequests}
              className="hidden h-10 w-72 shrink-0 items-center gap-2 rounded-md border bg-surface px-3 text-sm text-muted-foreground shadow-sm transition hover:border-ring/40 lg:flex xl:w-80"
              role="search"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={dictionary.common.systemSearchPlaceholder}
                aria-label={dictionary.common.systemSearch}
              />
              <button type="submit" className="sr-only">
                {dictionary.common.goToSearch}
              </button>
            </form>
            <ThemeToggle label={dictionary.common.toggleTheme} />
            <LanguageSwitcher locale={locale} label={dictionary.common.language} className="w-32 sm:w-36" />
            <button
              type="button"
              onClick={logout}
              aria-label={dictionary.common.logout}
              className="focus-ring inline-flex h-10 shrink-0 items-center gap-2 rounded-md border bg-surface px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{dictionary.common.logout}</span>
            </button>
          </header>
          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </I18nProvider>
  );
}
