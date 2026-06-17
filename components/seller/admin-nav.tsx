"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Admin workspace", shortLabel: "Admin" },
  { href: "/admin/leads", label: "Lead inbox", shortLabel: "Leads" },
  { href: "/admin/new", label: "Create preview", shortLabel: "Create" },
  { href: "/gallery", label: "Gallery" }
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href || pathname.startsWith("/admin/bundles");
  }

  return pathname === href;
}

export function AdminNav() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <nav className="flex shrink-0 items-center gap-1 text-sm font-medium" aria-label="Admin">
      {navItems.map((item) => {
        const isActive = isActivePath(pathname, item.href);

        return (
          <Button
            aria-current={isActive ? "page" : undefined}
            asChild
            className={cn("h-9 min-w-0 px-2 text-xs sm:min-w-32 sm:px-3 sm:text-sm", item.href === "/admin/new" && "sm:min-w-40")}
            key={item.href}
            size="lg"
            variant={isActive ? "default" : "ghost"}
          >
            <Link aria-label={item.label} href={item.href}>
              {"shortLabel" in item ? (
                <>
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </>
              ) : (
                item.label
              )}
            </Link>
          </Button>
        );
      })}
      <div className="ml-2 flex size-9 items-center justify-center">
        {isMounted ? <UserButton /> : <div className="size-8 rounded-full bg-muted" aria-hidden="true" />}
      </div>
    </nav>
  );
}
