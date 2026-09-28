"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Map,
  Sprout,
  ScanLine,
  CloudSun,
  Store,
  Wheat,
  Coins,
  Repeat,
  FlaskConical,
  BellRing,
  Users,
  Landmark,
  History,
  Microscope,
  UserCircle2,
  LogOut,
  Menu,
  X,
  Leaf,
  Globe2,
} from "lucide-react";
import { authApi, type UserProfile } from "@/lib/api";
import { LangProvider, useI18n, type Lang } from "@/lib/i18n";

const NAV: { href: string; key: string; icon: React.ElementType; section?: string }[] = [
  { href: "/app", key: "nav.overview", icon: LayoutGrid },
  { href: "/app/fields", key: "nav.fields", icon: Map },
  { href: "/app/recommend", key: "nav.recommend", icon: Sprout, section: "Intelligence" },
  { href: "/app/disease", key: "nav.disease", icon: ScanLine },
  { href: "/app/weather", key: "nav.weather", icon: CloudSun, section: "Environment" },
  { href: "/app/fertilizer", key: "nav.fertilizer", icon: FlaskConical },
  { href: "/app/rotation", key: "nav.rotation", icon: Repeat },
  { href: "/app/market", key: "nav.market", icon: Store, section: "Economics" },
  { href: "/app/yield", key: "nav.yield", icon: Wheat },
  { href: "/app/profit", key: "nav.profit", icon: Coins },
  { href: "/app/alerts", key: "nav.alerts", icon: BellRing, section: "Farm" },
  { href: "/app/community", key: "nav.community", icon: Users },
  { href: "/app/schemes", key: "nav.schemes", icon: Landmark },
  { href: "/app/history", key: "nav.history", icon: History },
  { href: "/app/models", key: "nav.models", icon: Microscope, section: "Academic" },
  { href: "/app/profile", key: "nav.profile", icon: UserCircle2 },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf text-husk">
        <Leaf size={18} />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-husk">
        Krishi<span className="text-sprout">Sense</span>
      </span>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
      {NAV.map((item) => {
        const active =
          item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <React.Fragment key={item.href}>
            {item.section && (
              <p className="mt-4 mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-husk/40">
                {item.section}
              </p>
            )}
            <a
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                active
                  ? "bg-husk/15 text-husk"
                  : "text-husk/65 hover:bg-husk/8 hover:text-husk"
              }`}
            >
              <Icon size={16} className={active ? "text-sprout" : ""} />
              {t(item.key)}
            </a>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function ShellInner({ user, children }: { user: UserProfile; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, lang, setLang } = useI18n();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);

  const logout = async () => {
    await authApi.logout();
    router.push("/login");
    router.refresh();
  };

  const page = NAV.find((n) =>
    n.href === "/app" ? pathname === "/app" : pathname.startsWith(n.href)
  );

  return (
    <div className="min-h-screen bg-husk">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-leafdeep lg:flex">
        <div className="px-5 py-5">
          <a href="/app">
            <Brand />
          </a>
        </div>
        <NavLinks />
        <div className="border-t border-husk/10 px-5 py-4 text-[11px] text-husk/40">
          Decision support, not guarantees.
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-line bg-card/90 backdrop-blur lg:pl-60">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-line p-2 lg:hidden"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
            >
              <Menu size={17} />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-soil">
                {page ? t(page.key) : "KrishiSense AI"}
              </p>
              <p className="hidden text-xs text-inkfaint sm:block">
                Explainable crop advisory & farm intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-inksoft hover:border-leaf/50"
              title="Toggle language / भाषा बदलें"
            >
              <Globe2 size={13} />
              {lang === "en" ? "हिं" : "EN"}
            </button>
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 hover:border-leaf/50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-leaf text-[11px] font-bold text-husk">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate text-xs font-semibold sm:block">
                  {user.name}
                </span>
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-line bg-card p-1.5 shadow-lg">
                  <a
                    href="/app/profile"
                    onClick={() => setMenu(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-linesoft"
                  >
                    <UserCircle2 size={14} /> {t("nav.profile")}
                  </a>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-clay hover:bg-claysoft"
                  >
                    <LogOut size={14} /> {t("common.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-leafdeep">
            <div className="flex items-center justify-between px-5 py-5">
              <Brand />
              <button onClick={() => setDrawer(false)} className="text-husk/70" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="px-4 pb-24 pt-6 sm:px-6 lg:pl-66 lg:pr-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card lg:hidden">
        {[NAV[0], NAV[1], NAV[2], NAV[3], NAV[7]].map((item) => {
          const active =
            item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold ${
                active ? "text-leaf" : "text-inkfaint"
              }`}
            >
              <Icon size={18} />
              {t(item.key).split(" ")[0]}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

export function AppShell({
  user,
  lang,
  children,
}: {
  user: UserProfile;
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <LangProvider initial={lang}>
      <ShellInner user={user}>{children}</ShellInner>
    </LangProvider>
  );
}

export function PageHeader({
  kicker,
  title,
  sub,
  right,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-soil">{kicker}</p>
        )}
        <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-inksoft">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
