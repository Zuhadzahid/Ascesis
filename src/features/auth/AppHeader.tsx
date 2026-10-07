"use client";

import { Suspense, useCallback, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIEW_TABS, parseViewTab, type ViewTab } from "@/features/canvas/views";

export function AppHeader({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-4 border-b border-olive-900/40 bg-olive-900 px-4 text-beige">
      <div className="flex shrink-0 items-center gap-2">
        <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-beige-100">
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            className="size-9 object-contain"
            priority
          />
        </span>
        <span className="text-base font-semibold tracking-tight">Ascesis</span>
      </div>

      <Suspense fallback={<div className="flex-1" />}>
        <ViewTabs />
      </Suspense>

      <UserMenu name={name} email={email} />
    </header>
  );
}

/** Tabs that switch which part of the system the canvas shows. */
function ViewTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = parseViewTab(params.get("tab"));

  const go = useCallback(
    (tab: ViewTab) => {
      const sp = new URLSearchParams(params.toString());
      sp.set("tab", tab);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  return (
    <nav className="min-w-0 flex-1 overflow-x-auto">
      <div className="flex items-center gap-0.5">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => go(tab.id)}
            aria-current={active === tab.id ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              active === tab.id
                ? "bg-teal text-ink"
                : "text-beige/70 hover:bg-beige/10 hover:text-beige",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function UserMenu({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const label = name || email || "Account";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-2 rounded-full border border-beige/20 bg-beige/10 py-1 pl-1 pr-3 text-sm text-beige transition-colors hover:bg-beige/20"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-teal text-ink">
          <User size={14} />
        </span>
        <span className="hidden max-w-[10rem] truncate sm:block">{label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-52 rounded-xl border border-card-border bg-card p-1 text-ink shadow-float">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{label}</p>
            {email && <p className="truncate text-xs text-ink-faint">{email}</p>}
          </div>
          <div className="my-1 h-px bg-card-border" />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-beige-200"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
