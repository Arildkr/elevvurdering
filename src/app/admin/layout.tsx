"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  kandidatnummer: string;
  isAdmin: boolean;
}

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/>
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1"/>
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1"/>
        <rect x="9" y="9" width="5.5" height="5.5" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/admin/groups",
    label: "Grupper",
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="5" r="2.5"/>
        <path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
        <circle cx="12.5" cy="5.5" r="1.8"/>
        <path d="M15 14c0-2-1.6-3.5-3.5-3.5"/>
      </svg>
    ),
  },
  {
    href: "/admin/assignments",
    label: "Oppgaver",
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="1.5" width="12" height="13" rx="1.5"/>
        <path d="M5 5.5h6M5 8.5h6M5 11.5h3.5"/>
      </svg>
    ),
  },
  {
    href: "/admin/statistics",
    label: "Statistikk",
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 14V9M6 14V5.5M10 14V8M14 14V2"/>
      </svg>
    ),
  },
  {
    href: "/admin/teachers",
    label: "Lærere",
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="5" r="3"/>
        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) { router.push("/login"); return; }
        const data = await res.json();
        if (!data.isAdmin) { router.push("/dashboard"); return; }
        setUser(data);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#edeae0]">
        <div className="text-gray-400 text-sm">Laster...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 flex flex-col flex-shrink-0">
        {/* Logo / Brand */}
        <div className="px-4 pt-5 pb-4">
          <img src="/logo-dark.png" alt="AK-Kreativ" className="h-7 w-auto ml-2" />
          <p className="text-slate-500 text-[11px] font-medium mt-2 tracking-wide uppercase">
            Elevvurdering
          </p>
        </div>

        <div className="mx-4 h-px bg-slate-800" />

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-amber-500/15 text-amber-400 font-medium"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-300 font-medium mb-0.5 truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 mb-3 truncate">Lærer</p>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Logg ut
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-[#edeae0] overflow-auto min-h-screen">{children}</main>
    </div>
  );
}
