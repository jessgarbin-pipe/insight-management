"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Briefing", href: "/" },
  { label: "Themes", href: "/explorer/themes" },
  { label: "Opportunities", href: "/explorer/opportunities" },
  { label: "Insights", href: "/explorer/insights" },
  { label: "Ask", href: "/ask" },
  { label: "Ingest", href: "/ingest" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-lg font-bold">Insight Manager</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={isActive(pathname, item.href) ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle>Navigation</SheetTitle>
              <nav className="flex flex-col space-y-1 mt-4">
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    variant={
                      isActive(pathname, item.href) ? "secondary" : "ghost"
                    }
                    className={cn("justify-start")}
                    asChild
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <Separator />
    </header>
  );
}
