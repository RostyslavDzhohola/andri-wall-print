"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Admin workspace" },
  { href: "/admin/new", label: "Create preview" }
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
            className={cn("h-9 min-w-0 px-3 sm:min-w-32", item.href === "/admin/new" && "sm:min-w-40")}
            key={item.href}
            size="lg"
            variant={isActive ? "default" : "ghost"}
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
      <div className="ml-2 flex size-9 items-center justify-center">
        {isMounted ? <UserButton /> : <div className="size-8 rounded-full bg-muted" aria-hidden="true" />}
      </div>
    </nav>
  );
}
